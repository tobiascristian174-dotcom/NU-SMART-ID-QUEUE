const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const Database = require('better-sqlite3');

const root = __dirname;
const dataDir = path.join(root, 'data');
const databaseDir = process.env.DATA_DIR
  ? path.resolve(process.env.DATA_DIR)
  : dataDir;

fs.mkdirSync(databaseDir, { recursive: true });

// SQLite database
const dbFile = path.join(databaseDir, 'database.db');
const db = new Database(dbFile);
db.pragma('foreign_keys = ON');

const schemaSql = fs.readFileSync(path.join(dataDir, 'schema.sql'), 'utf8');
db.exec(schemaSql);

const sessions = new Map();
const realtimeClients = new Set();

const PORT = process.env.PORT || 8080;
const SESSION_TTL = 1000 * 60 * 60 * 8;
const DEMO_MODE = process.env.DEMO_MODE === 'true';
const ADMIN_USERNAME = process.env.ADMIN_USERNAME || 'admin';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123';

if (
  process.env.NODE_ENV === 'production' &&
  (!process.env.ADMIN_USERNAME || !process.env.ADMIN_PASSWORD)
) {
  throw new Error('ADMIN_USERNAME and ADMIN_PASSWORD must be set in production.');
}

// Database helpers
const findUserByEmail = email =>
  db.prepare('SELECT * FROM student_accounts WHERE email = ?').get(email);

const findUserById = id =>
  db.prepare('SELECT * FROM student_accounts WHERE id = ?').get(id);

const publicUser = user => ({
  id: user.id,
  name: user.name,
  email: user.email,
  studentNo: user.student_no,
  program: user.program,
  createdAt: user.created_at
});

const json = (res, status, body, headers = {}) => {
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    ...headers
  });
  res.end(JSON.stringify(body));
};

const readBody = req => new Promise((resolve, reject) => {
  let body = '';

  req.on('data', chunk => {
    body += chunk;

    if (body.length > 10000) {
      reject(new Error('Request too large'));
    }
  });

  req.on('end', () => {
    try {
      resolve(JSON.parse(body || '{}'));
    } catch {
      reject(new Error('Invalid JSON'));
    }
  });

  req.on('error', reject);
});

const hashPassword = password => new Promise((resolve, reject) => {
  const salt = crypto.randomBytes(16).toString('hex');

  crypto.scrypt(password, salt, 64, (error, derivedKey) => {
    if (error) {
      reject(error);
    } else {
      resolve(`${salt}:${derivedKey.toString('hex')}`);
    }
  });
});

const verifyPassword = (password, stored) => new Promise(resolve => {
  const [salt, key] = String(stored).split(':');

  if (!salt || !key) {
    return resolve(false);
  }

  crypto.scrypt(password, salt, 64, (error, derivedKey) => {
    if (error) {
      return resolve(false);
    }

    const expected = Buffer.from(key, 'hex');

    resolve(
      expected.length === derivedKey.length &&
      crypto.timingSafeEqual(expected, derivedKey)
    );
  });
});

const cookie = (req, name) =>
  (req.headers.cookie || '')
    .split(';')
    .map(value => value.trim().split('='))
    .find(pair => pair[0] === name)?.[1];

const sessionCookie = token =>
  `nu_session=${token}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${SESSION_TTL / 1000}${process.env.NODE_ENV === 'production' ? '; Secure' : ''}`;

const safeName = value =>
  String(value || '').trim().replace(/\s+/g, ' ');

const validEmail = value =>
  /^(?:[^\s@]+@(?:nu-[^\s@]+|national-u)\.edu\.ph)$/i.test(value);

const getSession = req => {
  const token = cookie(req, 'nu_session');
  const session = token && sessions.get(token);

  if (!session || session.expires < Date.now()) {
    if (token) sessions.delete(token);
    return null;
  }

  return session;
};

const currentUser = req => {
  const session = getSession(req);

  if (!session) {
    return null;
  }

  return session.demoUser || findUserById(session.userId) || null;
};

const queueRowToView = row => ({
  id: row.id,
  number: Number(row.queue_number),
  name: row.name,
  studentNo: row.student_no,
  time: row.joined_at
    ? new Date(row.joined_at).toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit'
      })
    : '',
  window: row.window || 'Window 3',
  status: row.status || 'Waiting',
  waitMinutes: Number(row.wait_minutes || 0),
  studentId: row.student_id
});

const applicationRowToView = row => ({
  id: row.id,
  name: row.name,
  studentNo: row.student_no,
  applicationType: row.application_type || 'New ID',
  dateApplied: row.created_at
    ? new Date(row.created_at).toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      })
    : '',
  status: row.status || 'Submitted',
  updatedAt: row.updated_at
});

const buildRealtimeStateForSession = session => {
  const user = session?.demoUser || (session?.userId ? findUserById(session.userId) : null);
  const queueRows = db.prepare(`
    SELECT * FROM queue_entries
    ORDER BY queue_number ASC, joined_at ASC
  `).all();
  const applicationRows = db.prepare(`
    SELECT * FROM application_records
    ORDER BY updated_at DESC, created_at DESC
  `).all();

  const visibleQueue = session?.admin
    ? queueRows
    : queueRows.filter(row => !row.student_id || row.student_id === user?.id || row.student_no === user?.student_no);

  const visibleApplications = session?.admin
    ? applicationRows
    : applicationRows.filter(row => row.student_id === user?.id || row.student_no === user?.student_no);

  return {
    user: user ? publicUser(user) : null,
    queue: visibleQueue.map(queueRowToView),
    applications: visibleApplications.map(applicationRowToView)
  };
};

const sendSseEvent = (res, eventName, payload) => {
  res.write(`event: ${eventName}\n`);
  res.write(`data: ${JSON.stringify(payload)}\n\n`);
};

const broadcastRealtimeState = (eventName, action, scopeUserId = null) => {
  for (const client of realtimeClients) {
    const session = client.session || null;
    const isRelevantClient =
      !scopeUserId ||
      client.admin ||
      client.userId === scopeUserId ||
      (session && session.userId === scopeUserId);

    if (!isRelevantClient && !client.admin) {
      continue;
    }

    sendSseEvent(
      client.res,
      eventName,
      {
        action,
        state: buildRealtimeStateForSession(session)
      }
    );
  }
};

async function api(req, res) {

  // ADMIN LOGIN
  if (req.method === 'POST' && req.url === '/api/admin/login') {
    try {
      const input = await readBody(req);

      if (
        String(input.username || '') !== ADMIN_USERNAME ||
        String(input.password || '') !== ADMIN_PASSWORD
      ) {
        return json(res, 401, {
          error: 'Invalid staff username or password.'
        });
      }

      const token = crypto.randomBytes(32).toString('hex');
      sessions.set(token, {
        admin: true,
        expires: Date.now() + SESSION_TTL
      });

      return json(
        res,
        200,
        { ok: true },
        { 'Set-Cookie': sessionCookie(token) }
      );
    } catch (error) {
      console.error('Admin login error:', error);

      return json(res, 400, {
        error: 'Unable to sign in.'
      });
    }
  }

  // ADMIN STUDENT DIRECTORY
  if (req.method === 'GET' && req.url === '/api/admin/students') {
    const token = cookie(req, 'nu_session');
    const session = token && sessions.get(token);

    if (!session?.admin || session.expires < Date.now()) {
      return json(res, 401, {
        error: 'Staff authentication required.'
      });
    }

    const students = db.prepare(`
      SELECT id, name, email, student_no, program, created_at
      FROM student_accounts
      ORDER BY created_at DESC, name COLLATE NOCASE
    `).all().map(user => ({
      id: user.id,
      name: user.name,
      studentNo: user.student_no,
      email: user.email,
      program: user.program,
      createdAt: user.created_at
    }));

    return json(res, 200, { students });
  }

  // REGISTER
  if (req.method === 'POST' && req.url === '/api/register') {
    try {
      const input = await readBody(req);

      const name = safeName(input.name);
      const email = String(input.email || '').trim().toLowerCase();
      const studentNo = String(input.studentNo || '').trim();
      const program = safeName(input.program);
      const password = String(input.password || '');

      if (name.length < 2 || name.length > 100) {
        return json(res, 400, {
          error: 'Enter a valid full name.'
        });
      }

      if (!validEmail(email)) {
        return json(res, 400, {
          error: 'Use a valid NU email address.'
        });
      }

      if (!studentNo || studentNo.length > 50) {
        return json(res, 400, {
          error: 'Enter a valid student ID number.'
        });
      }

      if (!program || program.length > 100) {
        return json(res, 400, {
          error: 'Select a valid program.'
        });
      }

      if (password.length < 8) {
        return json(res, 400, {
          error: 'Password must be at least 8 characters.'
        });
      }

      // Check if email already exists
      if (findUserByEmail(email)) {
        return json(res, 409, {
          error: 'An account with this email already exists.'
        });
      }

      if (db.prepare('SELECT id FROM student_accounts WHERE student_no = ?').get(studentNo)) {
        return json(res, 409, {
          error: 'An account with this student ID number already exists.'
        });
      }

      const id = crypto.randomUUID();
      const passwordHash = await hashPassword(password);

      // Insert account into SQLite
      db.prepare(`
        INSERT INTO student_accounts
          (id, name, email, student_no, program, password_hash)
        VALUES
          (?, ?, ?, ?, ?, ?)
      `).run(
        id,
        name,
        email,
        studentNo,
        program,
        passwordHash
      );

      const user = findUserById(id);

      const token = crypto.randomBytes(32).toString('hex');

      sessions.set(token, {
        userId: id,
        expires: Date.now() + SESSION_TTL
      });

      return json(
        res,
        201,
        { user: publicUser(user) },
        { 'Set-Cookie': sessionCookie(token) }
      );

    } catch (error) {
      console.error('Registration error:', error);

      return json(res, 400, {
        error: 'Unable to create account.'
      });
    }
  }

  // LOGIN
  if (req.method === 'POST' && req.url === '/api/login') {
    try {
      const input = await readBody(req);

      const email =
        String(input.email || '').trim().toLowerCase();

      if (DEMO_MODE) {
        const demoUser = {
          id: 'demo-student',
          name: 'Demo Student',
          email: email || 'demo@nu-baliwag.edu.ph',
          studentNo: 'DEMO-00001',
          program: 'Demo Student'
        };

        const token =
          crypto.randomBytes(32).toString('hex');

        sessions.set(token, {
          userId: demoUser.id,
          demoUser,
          expires: Date.now() + SESSION_TTL
        });

        return json(
          res,
          200,
          { user: demoUser, demo: true },
          { 'Set-Cookie': sessionCookie(token) }
        );
      }

      // Find account in SQLite
      const user = findUserByEmail(email);

      if (
        !user ||
        !(await verifyPassword(
          String(input.password || ''),
          user.password_hash
        ))
      ) {
        return json(res, 401, {
          error: 'Invalid email or password.'
        });
      }

      const token =
        crypto.randomBytes(32).toString('hex');

      sessions.set(token, {
        userId: user.id,
        expires: Date.now() + SESSION_TTL
      });

      return json(
        res,
        200,
        { user: publicUser(user) },
        { 'Set-Cookie': sessionCookie(token) }
      );

    } catch (error) {
      console.error('Login error:', error);

      return json(res, 400, {
        error: 'Unable to sign in.'
      });
    }
  }

  if (req.method === 'GET' && req.url === '/api/events') {
    const session = getSession(req);

    if (!session) {
      return json(res, 401, { error: 'Authentication required.' });
    }

    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no'
    });

    const client = {
      res,
      userId: session.userId || null,
      admin: !!session.admin,
      session
    };

    realtimeClients.add(client);
    sendSseEvent(res, 'connected', { ok: true });
    const keepalive = setInterval(() => {
      if (!res.writableEnded) res.write(': keepalive\n\n');
    }, 25000);

    req.on('close', () => {
      clearInterval(keepalive);
      realtimeClients.delete(client);
    });

    return;
  }

  if (req.method === 'GET' && req.url === '/api/shared-state') {
    const session = getSession(req);

    if (!session) {
      return json(res, 401, { error: 'Authentication required.' });
    }

    return json(res, 200, buildRealtimeStateForSession(session));
  }

  if (req.method === 'POST' && req.url === '/api/realtime/sync') {
    try {
      const session = getSession(req);
      const input = await readBody(req);

      if (!session) {
        return json(res, 401, { error: 'Authentication required.' });
      }

      const user = currentUser(req);
      const action = String(input.action || '');
      const studentNo = String(input.studentNo || '').trim();
      const name = safeName(input.name);
      const program = safeName(input.program);

      if (action === 'queue.join') {
        if (!user) {
          return json(res, 401, { error: 'Authentication required.' });
        }

        const isFirstInQueue = !db.prepare(`
          SELECT id FROM queue_entries WHERE status IN ('Waiting', 'Serving') LIMIT 1
        `).get();
        const queueNumber = Number(input.queueNumber ||
          (db.prepare('SELECT COALESCE(MAX(queue_number),0) + 1 AS next_number FROM queue_entries').get()?.next_number || 1));

        const existingQueue = db.prepare(`
          SELECT id FROM queue_entries
          WHERE student_id = ? AND status IN ('Waiting', 'Serving')
          LIMIT 1
        `).get(user.id);

        if (!existingQueue) {
          db.prepare(`
            INSERT INTO queue_entries
              (id, student_id, student_no, name, window, status, wait_minutes, queue_number, joined_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `).run(
            crypto.randomUUID(),
            user.id,
            user.student_no,
            user.name,
            'Window 3',
            isFirstInQueue ? 'Serving' : 'Waiting',
            0,
            queueNumber,
            new Date().toISOString(),
            new Date().toISOString()
          );
        }

        const appRecord = db.prepare(`SELECT id FROM application_records WHERE student_id = ?`).get(user.id);
        if (!appRecord) {
          db.prepare(`
            INSERT INTO application_records
              (id, student_id, student_no, name, application_type, status, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
          `).run(
            crypto.randomUUID(),
            user.id,
            user.student_no,
            user.name,
            'New ID',
            'Submitted',
            new Date().toISOString(),
            new Date().toISOString()
          );
        }

        const state = buildRealtimeStateForSession(session);
        broadcastRealtimeState('state.updated', action, user.id);
        return json(res, 200, { ok: true, state });
      }

      if (action === 'queue.leave') {
        if (!user) {
          return json(res, 401, { error: 'Authentication required.' });
        }

        db.prepare(`DELETE FROM queue_entries WHERE student_id = ?`).run(user.id);
        db.prepare(`UPDATE application_records SET status = 'Submitted', updated_at = ? WHERE student_id = ?`).run(new Date().toISOString(), user.id);
        const state = buildRealtimeStateForSession(session);
        broadcastRealtimeState('state.updated', action, user.id);
        return json(res, 200, { ok: true, state });
      }

      if (action === 'queue.update') {
        if (!session.admin) {
          return json(res, 403, { error: 'Staff access required.' });
        }

        const queueNumber = Number(input.queueNumber || 0);
        const nextStatus = String(input.status || 'Waiting');
        const queueEntry = queueNumber > 0
          ? db.prepare('SELECT student_no FROM queue_entries WHERE queue_number = ?').get(queueNumber)
          : null;

        if (queueNumber > 0) {
          db.prepare(`
            UPDATE queue_entries
            SET status = ?, updated_at = ?, wait_minutes = COALESCE(?, wait_minutes)
            WHERE queue_number = ?
          `).run(nextStatus, new Date().toISOString(), input.waitMinutes !== undefined ? Number(input.waitMinutes) : null, queueNumber);
        }

        const affectedStudentNo = studentNo || queueEntry?.student_no;
        if (affectedStudentNo && input.waitMinutes === undefined) {
          db.prepare(`
            UPDATE application_records
            SET status = ?, updated_at = ?
            WHERE student_no = ?
          `).run(nextStatus === 'Completed' ? 'Claimed' : nextStatus === 'Serving' ? 'Processing' : 'Submitted', new Date().toISOString(), affectedStudentNo);
        }

        const state = buildRealtimeStateForSession(session);
        broadcastRealtimeState('state.updated', action, session.userId || null);
        return json(res, 200, { ok: true, state });
      }

      if (action === 'queue.remove') {
        if (!session.admin) {
          return json(res, 403, { error: 'Staff access required.' });
        }

        const queueNumber = Number(input.queueNumber || 0);
        const queueEntry = db.prepare('SELECT student_id, student_no FROM queue_entries WHERE queue_number = ?').get(queueNumber);
        db.prepare('DELETE FROM queue_entries WHERE queue_number = ?').run(queueNumber);
        if (queueEntry?.student_no) {
          db.prepare(`UPDATE application_records SET status = 'Submitted', updated_at = ? WHERE student_no = ?`)
            .run(new Date().toISOString(), queueEntry.student_no);
        }

        const state = buildRealtimeStateForSession(session);
        broadcastRealtimeState('state.updated', action, queueEntry?.student_id || null);
        return json(res, 200, { ok: true, state });
      }

      if (action === 'application.update') {
        if (!session.admin && (!user || !studentNo || studentNo !== user.student_no)) {
          return json(res, 403, { error: 'Not allowed.' });
        }

        const nextStatus = String(input.status || 'Submitted');

        if (studentNo) {
          db.prepare(`
            UPDATE application_records
            SET status = ?, updated_at = ?
            WHERE student_no = ?
          `).run(nextStatus, new Date().toISOString(), studentNo);
        }

        if (user && !studentNo) {
          db.prepare(`
            UPDATE application_records
            SET status = ?, updated_at = ?
            WHERE student_id = ?
          `).run(nextStatus, new Date().toISOString(), user.id);
        }

        const state = buildRealtimeStateForSession(session);
        broadcastRealtimeState('state.updated', action, user?.id || null);
        return json(res, 200, { ok: true, state });
      }

      if (action === 'application.remove') {
        if (!session.admin) {
          return json(res, 403, { error: 'Staff access required.' });
        }

        const application = db.prepare('SELECT student_id FROM application_records WHERE student_no = ?').get(studentNo);
        db.prepare('DELETE FROM queue_entries WHERE student_no = ?').run(studentNo);
        db.prepare('DELETE FROM application_records WHERE student_no = ?').run(studentNo);
        const state = buildRealtimeStateForSession(session);
        broadcastRealtimeState('state.updated', action, application?.student_id || null);
        return json(res, 200, { ok: true, state });
      }

      if (action === 'queue.clear') {
        if (!session.admin) {
          return json(res, 403, { error: 'Staff access required.' });
        }

        db.prepare('DELETE FROM queue_entries').run();
  db.prepare(`UPDATE application_records SET status = 'Submitted', updated_at = ?`).run(new Date().toISOString());
        const state = buildRealtimeStateForSession(session);
        broadcastRealtimeState('state.updated', action, null);
        return json(res, 200, { ok: true, state });
      }

      return json(res, 400, { error: 'Unsupported realtime action.' });
    } catch (error) {
      console.error('Realtime sync error:', error);
      return json(res, 400, { error: 'Unable to sync state.' });
    }
  }

  // CURRENT USER
  if (req.method === 'GET' && req.url === '/api/me') {
    const user = currentUser(req);

    return user
      ? json(res, 200, { user: publicUser(user) })
      : json(res, 401, {
          error: 'Authentication required.'
        });
  }

  // LOGOUT
  if (req.method === 'POST' && req.url === '/api/logout') {
    const token = cookie(req, 'nu_session');

    if (token) {
      sessions.delete(token);
    }

    return json(
      res,
      200,
      { ok: true },
      {
        'Set-Cookie':
          `nu_session=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0${process.env.NODE_ENV === 'production' ? '; Secure' : ''}`
      }
    );
  }

  return json(res, 404, {
    error: 'Not found.'
  });
}

const mime = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.svg': 'image/svg+xml',
  '.webmanifest': 'application/manifest+json; charset=utf-8'
};
const publicFiles = new Set([
  'index.html',
  'app.js',
  'styles.css',
  'manifest.webmanifest',
  'service-worker.js'
]);

const server = http.createServer((req, res) => {

  if (req.url.startsWith('/api/')) {
    return api(req, res);
  }

  const requested =
    req.url === '/'
      ? '/index.html'
      : req.url.split('?')[0];

  const file =
    path.normalize(path.join(root, requested));
  const relativePath = path.relative(root, file);
  const isPublicFile = publicFiles.has(relativePath) || relativePath.startsWith(`assets${path.sep}`);

  if (
    relativePath.startsWith('..') ||
    path.isAbsolute(relativePath) ||
    !isPublicFile ||
    !fs.existsSync(file) ||
    fs.statSync(file).isDirectory()
  ) {
    return json(res, 404, {
      error: 'Not found.'
    });
  }

  res.writeHead(200, {
    'Content-Type':
      mime[path.extname(file)] ||
      'application/octet-stream'
  });

  fs.createReadStream(file).pipe(res);
});

server.listen(PORT, () => {
  console.log(
    `NU Smart ID Queue running at http://localhost:${PORT}`
  );
});