import {
  CapacitorSQLite,
  SQLiteConnection,
  SQLiteDBConnection,
} from "@capacitor-community/sqlite";
import { Capacitor } from "@capacitor/core";
import { ReceiveRecord, SendRecord, Party, FileAttachment } from "../types";

class DatabaseService {
  private sqlite: SQLiteConnection;
  private db: SQLiteDBConnection | null = null;
  private readonly dbName = "partyapp.db";

  constructor() {
    this.sqlite = new SQLiteConnection(CapacitorSQLite);
  }

  // Add this method to your DatabaseService class
  private async upgradeDatabase(): Promise<void> {
    if (!this.db) throw new Error("Database not initialized");

    try {
      // Check if base64_data column exists
      const tableInfo = await this.db.query(
        "PRAGMA table_info(file_attachments)"
      );

      const hasBase64Column = tableInfo.values?.some(
        (column: any) => column.name === "base64_data"
      );

      if (!hasBase64Column) {
        console.log("Upgrading database schema...");

        // Add new columns for enhanced file storage
        const upgradeSQL = `
        ALTER TABLE file_attachments ADD COLUMN base64_data TEXT;
        ALTER TABLE file_attachments ADD COLUMN mime_type TEXT;
        ALTER TABLE file_attachments ADD COLUMN file_size INTEGER;
      `;

        await this.db.execute(upgradeSQL);
        console.log("Database upgraded successfully");
      }
    } catch (error) {
      console.log("Database upgrade error (might be expected):", error);
    }
  }

  async initializeDatabase(): Promise<void> {
    try {
      // Check if platform is available
      if (Capacitor.getPlatform() === "web") {
        await this.sqlite.initWebStore();
      }

      // Open database
      this.db = await this.sqlite.createConnection(
        this.dbName,
        false,
        "no-encryption",
        1,
        false
      );

      await this.db.open();
      await this.createTables();
      await this.upgradeDatabase(); // Add this line
    } catch (error) {
      console.error("Database initialization error:", error);
      throw error;
    }
  }

  private async createTables(): Promise<void> {
    if (!this.db) throw new Error("Database not initialized");

    const createTables = `
      -- Parties table
      CREATE TABLE IF NOT EXISTS parties (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL UNIQUE,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      -- Receive records table
      CREATE TABLE IF NOT EXISTS receive_records (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        party_name TEXT NOT NULL,
        lr_number TEXT NOT NULL,
        amount REAL NOT NULL,
        date DATE NOT NULL,
        other_details TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      -- Send records table
      CREATE TABLE IF NOT EXISTS send_records (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        amount REAL NOT NULL,
        party_name TEXT,
        lr_number TEXT,
        image TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      -- File attachments table
      CREATE TABLE IF NOT EXISTS file_attachments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        record_id INTEGER NOT NULL,
        record_type TEXT NOT NULL CHECK(record_type IN ('receive', 'send')),
        file_name TEXT NOT NULL,
        file_path TEXT NOT NULL,
        file_type TEXT NOT NULL CHECK(file_type IN ('image', 'pdf')),
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (record_id) REFERENCES receive_records(id) ON DELETE CASCADE
      );

      -- Indexes
      CREATE INDEX IF NOT EXISTS idx_receive_party ON receive_records(party_name);
      CREATE INDEX IF NOT EXISTS idx_receive_lr ON receive_records(lr_number);
      CREATE INDEX IF NOT EXISTS idx_send_party ON send_records(party_name);
      CREATE INDEX IF NOT EXISTS idx_file_record ON file_attachments(record_id, record_type);
    `;

    await this.db.execute(createTables);
  }

  // Party operations
  async addParty(name: string): Promise<number> {
    if (!this.db) throw new Error("Database not initialized");

    const query =
      "INSERT INTO parties (name) VALUES (?) ON CONFLICT(name) DO NOTHING";
    const result = await this.db.run(query, [name]);

    if (result.changes?.lastId) {
      return result.changes.lastId;
    }

    // If no insert (conflict), get existing ID
    const existing = await this.db.query(
      "SELECT id FROM parties WHERE name = ?",
      [name]
    );
    return existing.values?.[0]?.id || 0;
  }

  async getParties(): Promise<Party[]> {
    if (!this.db) throw new Error("Database not initialized");

    const result = await this.db.query("SELECT * FROM parties ORDER BY name");
    return result.values || [];
  }

  // Receive record operations
  async addReceiveRecord(
    record: Omit<ReceiveRecord, "id" | "files" | "created_at" | "updated_at">
  ): Promise<number> {
    if (!this.db) throw new Error("Database not initialized");

    await this.addParty(record.party_name);

    const query = `
      INSERT INTO receive_records (party_name, lr_number, amount, date, other_details)
      VALUES (?, ?, ?, ?, ?)
    `;

    const result = await this.db.run(query, [
      record.party_name,
      record.lr_number,
      record.amount,
      record.date,
      record.other_details || null,
    ]);

    return result.changes?.lastId || 0;
  }

  async getReceiveRecords(): Promise<ReceiveRecord[]> {
    if (!this.db) throw new Error("Database not initialized");

    const query = "SELECT * FROM receive_records ORDER BY created_at DESC";
    const result = await this.db.query(query);
    const records = result.values || [];

    // Get files for each record
    for (const record of records) {
      record.files = await this.getFileAttachments(record.id, "receive");
    }

    return records;
  }

  async updateReceiveRecord(
    id: number,
    record: Partial<ReceiveRecord>
  ): Promise<void> {
    if (!this.db) throw new Error("Database not initialized");

    const fields = [];
    const values = [];

    if (record.party_name) {
      fields.push("party_name = ?");
      values.push(record.party_name);
      await this.addParty(record.party_name);
    }
    if (record.lr_number) {
      fields.push("lr_number = ?");
      values.push(record.lr_number);
    }
    if (record.amount !== undefined) {
      fields.push("amount = ?");
      values.push(record.amount);
    }
    if (record.date) {
      fields.push("date = ?");
      values.push(record.date);
    }
    if (record.other_details !== undefined) {
      fields.push("other_details = ?");
      values.push(record.other_details);
    }

    fields.push("updated_at = CURRENT_TIMESTAMP");
    values.push(id);

    const query = `UPDATE receive_records SET ${fields.join(
      ", "
    )} WHERE id = ?`;
    await this.db.run(query, values);
  }

  async deleteReceiveRecord(id: number): Promise<void> {
    if (!this.db) throw new Error("Database not initialized");
    await this.db.run("DELETE FROM receive_records WHERE id = ?", [id]);
  }

  // Send record operations
  async addSendRecord(
    record: Omit<SendRecord, "id" | "created_at" | "updated_at">
  ): Promise<number> {
    if (!this.db) throw new Error("Database not initialized");

    if (record.party_name) {
      await this.addParty(record.party_name);
    }

    const query = `
      INSERT INTO send_records (amount, party_name, lr_number, image)
      VALUES (?, ?, ?, ?)
    `;

    const result = await this.db.run(query, [
      record.amount,
      record.party_name || null,
      record.lr_number || null,
      record.image || null,
    ]);

    return result.changes?.lastId || 0;
  }

  async getSendRecords(): Promise<SendRecord[]> {
    if (!this.db) throw new Error("Database not initialized");

    const query = "SELECT * FROM send_records ORDER BY created_at DESC";
    const result = await this.db.query(query);
    return result.values || [];
  }

  async updateSendRecord(
    id: number,
    record: Partial<SendRecord>
  ): Promise<void> {
    if (!this.db) throw new Error("Database not initialized");

    const fields = [];
    const values = [];

    if (record.amount !== undefined) {
      fields.push("amount = ?");
      values.push(record.amount);
    }
    if (record.party_name !== undefined) {
      fields.push("party_name = ?");
      values.push(record.party_name);
      if (record.party_name) await this.addParty(record.party_name);
    }
    if (record.lr_number !== undefined) {
      fields.push("lr_number = ?");
      values.push(record.lr_number);
    }
    if (record.image !== undefined) {
      fields.push("image = ?");
      values.push(record.image);
    }

    fields.push("updated_at = CURRENT_TIMESTAMP");
    values.push(id);

    const query = `UPDATE send_records SET ${fields.join(", ")} WHERE id = ?`;
    await this.db.run(query, values);
  }

  async deleteSendRecord(id: number): Promise<void> {
    if (!this.db) throw new Error("Database not initialized");
    await this.db.run("DELETE FROM send_records WHERE id = ?", [id]);
  }

  // File attachment operations
  async addFileAttachment(attachment: {
    record_id: number;
    record_type?: string;
    file_name: string;
    file_path: string;
    file_type: string;
    base64_data?: string;
    mime_type?: string;
    file_size?: number;
  }): Promise<number> {
    if (!this.db) throw new Error("Database not initialized");

    const query = `
    INSERT INTO file_attachments (
      record_id, record_type, file_name, file_path, file_type, 
      base64_data, mime_type, file_size
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `;

    const result = await this.db.run(query, [
      attachment.record_id,
      attachment.record_type || "receive",
      attachment.file_name,
      attachment.file_path,
      attachment.file_type,
      attachment.base64_data || null,
      attachment.mime_type || null,
      attachment.file_size || null,
    ]);

    return result.changes?.lastId || 0;
  }

  async getFileAttachments(
    recordId: number,
    recordType: "receive" | "send"
  ): Promise<FileAttachment[]> {
    if (!this.db) throw new Error("Database not initialized");

    const query =
      "SELECT * FROM file_attachments WHERE record_id = ? AND record_type = ?";
    const result = await this.db.query(query, [recordId, recordType]);
    return result.values || [];
  }

  async deleteFileAttachment(id: number): Promise<void> {
    if (!this.db) throw new Error("Database not initialized");
    await this.db.run("DELETE FROM file_attachments WHERE id = ?", [id]);
  }
}



export const dbService = new DatabaseService();
