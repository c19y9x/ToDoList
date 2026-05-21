use rusqlite::{Connection, Result as SqliteResult};
use serde::{Deserialize, Serialize};
use std::path::PathBuf;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Task {
    pub id: String,
    pub title: String,
    pub description: String,
    pub due_date: Option<String>,
    pub completed: bool,
    pub snooze_until: Option<String>,
    pub sort_order: i32,
    pub created_at: String,
    pub updated_at: String,
}

pub fn init_db(app_data_dir: PathBuf) -> SqliteResult<Connection> {
    std::fs::create_dir_all(&app_data_dir).ok();

    let db_path = app_data_dir.join("hitodo.db");
    let conn = Connection::open(db_path)?;

    conn.execute_batch(
        "CREATE TABLE IF NOT EXISTS tasks (
            id TEXT PRIMARY KEY,
            title TEXT NOT NULL,
            description TEXT DEFAULT '',
            due_date TEXT,
            completed INTEGER DEFAULT 0,
            snooze_until TEXT,
            sort_order INTEGER DEFAULT 0,
            created_at TEXT DEFAULT (datetime('now', 'localtime')),
            updated_at TEXT DEFAULT (datetime('now', 'localtime'))
        );",
    )?;

    Ok(conn)
}

pub fn get_all_tasks(conn: &Connection) -> SqliteResult<Vec<Task>> {
    let mut stmt = conn.prepare(
        "SELECT id, title, description, due_date, completed, snooze_until,
                sort_order, created_at, updated_at
         FROM tasks ORDER BY sort_order ASC, created_at DESC",
    )?;

    let tasks = stmt
        .query_map([], |row| {
            Ok(Task {
                id: row.get(0)?,
                title: row.get(1)?,
                description: row.get(2)?,
                due_date: row.get(3)?,
                completed: row.get::<_, i32>(4)? != 0,
                snooze_until: row.get(5)?,
                sort_order: row.get(6)?,
                created_at: row.get(7)?,
                updated_at: row.get(8)?,
            })
        })?
        .collect::<SqliteResult<Vec<Task>>>()?;

    Ok(tasks)
}

pub fn upsert_task(conn: &Connection, task: &Task) -> SqliteResult<()> {
    conn.execute(
        "INSERT INTO tasks (id, title, description, due_date, completed, snooze_until, sort_order, updated_at)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, datetime('now', 'localtime'))
         ON CONFLICT(id) DO UPDATE SET
            title = excluded.title,
            description = excluded.description,
            due_date = excluded.due_date,
            completed = excluded.completed,
            snooze_until = excluded.snooze_until,
            sort_order = excluded.sort_order,
            updated_at = datetime('now', 'localtime')",
        (
            &task.id,
            &task.title,
            &task.description,
            &task.due_date,
            task.completed as i32,
            &task.snooze_until,
            task.sort_order,
        ),
    )?;
    Ok(())
}

pub fn delete_task(conn: &Connection, id: &str) -> SqliteResult<()> {
    conn.execute("DELETE FROM tasks WHERE id = ?1", [id])?;
    Ok(())
}

pub fn complete_task(conn: &Connection, id: &str) -> SqliteResult<()> {
    conn.execute(
        "UPDATE tasks SET completed = 1, snooze_until = NULL, updated_at = datetime('now', 'localtime') WHERE id = ?1",
        [id],
    )?;
    Ok(())
}

pub fn snooze_task(conn: &Connection, id: &str, snooze_until: &str) -> SqliteResult<()> {
    conn.execute(
        "UPDATE tasks SET snooze_until = ?1, updated_at = datetime('now', 'localtime') WHERE id = ?2",
        [snooze_until, id],
    )?;
    Ok(())
}

pub fn get_due_tasks(conn: &Connection) -> SqliteResult<Vec<Task>> {
    let mut stmt = conn.prepare(
        "SELECT id, title, description, due_date, completed, snooze_until,
                sort_order, created_at, updated_at
         FROM tasks
         WHERE completed = 0
           AND due_date IS NOT NULL
           AND REPLACE(due_date, 'T', ' ') <= datetime('now', 'localtime')
           AND (snooze_until IS NULL OR REPLACE(snooze_until, 'T', ' ') <= datetime('now', 'localtime'))
         ORDER BY due_date ASC
         LIMIT 5",
    )?;

    let tasks = stmt
        .query_map([], |row| {
            Ok(Task {
                id: row.get(0)?,
                title: row.get(1)?,
                description: row.get(2)?,
                due_date: row.get(3)?,
                completed: row.get::<_, i32>(4)? != 0,
                snooze_until: row.get(5)?,
                sort_order: row.get(6)?,
                created_at: row.get(7)?,
                updated_at: row.get(8)?,
            })
        })?
        .collect::<SqliteResult<Vec<Task>>>()?;

    Ok(tasks)
}
