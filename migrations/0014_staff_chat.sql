CREATE TABLE chat_threads (
 id TEXT PRIMARY KEY,
 kind TEXT NOT NULL CHECK(kind IN ('direct','group')),
 title TEXT NOT NULL,
 direct_employee_id TEXT UNIQUE REFERENCES employees(id),
 created_at INTEGER NOT NULL,
 updated_at INTEGER NOT NULL
);
CREATE TABLE chat_members (
 thread_id TEXT NOT NULL REFERENCES chat_threads(id),
 employee_id TEXT NOT NULL REFERENCES employees(id),
 PRIMARY KEY(thread_id,employee_id)
);
CREATE INDEX chat_members_employee ON chat_members(employee_id,thread_id);
CREATE TABLE chat_messages (
 id INTEGER PRIMARY KEY AUTOINCREMENT,
 thread_id TEXT NOT NULL REFERENCES chat_threads(id),
 sender_key TEXT NOT NULL,
 sender_name TEXT NOT NULL,
 client_key TEXT NOT NULL,
 body TEXT NOT NULL CHECK(length(trim(body)) BETWEEN 1 AND 4000),
 created_at INTEGER NOT NULL,
 UNIQUE(sender_key,client_key)
);
CREATE INDEX chat_messages_thread ON chat_messages(thread_id,id DESC);
CREATE TABLE chat_reads (
 thread_id TEXT NOT NULL REFERENCES chat_threads(id),
 reader_key TEXT NOT NULL,
 last_message_id INTEGER NOT NULL DEFAULT 0,
 PRIMARY KEY(thread_id,reader_key)
);
