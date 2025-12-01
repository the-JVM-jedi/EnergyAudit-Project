const db = require('./db');

module.exports = {
  Query: {
    audits: async () => {
      const [rows] = await db.query('SELECT audit_id, audit_name, notes, created_at FROM Audits ORDER BY audit_id DESC');
      return rows;
    },
    audit: async (_, { id }) => {
      const [auditRows] = await db.query('SELECT audit_id, audit_name, notes, created_at FROM Audits WHERE audit_id = ?', [id]);
      if (!auditRows || auditRows.length === 0) return null;
      const audit = auditRows[0];
      const [devices] = await db.query('SELECT id, audit_id, device_class, description, power_rating_watts, quantity, hours_per_day, daily_kwh_total FROM Devices WHERE audit_id = ?', [id]);
      audit.devices = devices;
      return audit;
    }
  },
  Mutation: {
    saveAudit: async (_, { auditName, notes, devices }) => {
      const conn = await db.getConnection();
      try {
        await conn.beginTransaction();
        const [res] = await conn.execute('INSERT INTO Audits (audit_name, notes) VALUES (?, ?)', [auditName, notes]);
        const auditId = res.insertId;
        const insertDeviceSql = `INSERT INTO Devices (audit_id, device_class, description, power_rating_watts, quantity, hours_per_day, daily_kwh_total) VALUES (?, ?, ?, ?, ?, ?, ?)`;
        for (const d of devices) {
          await conn.execute(insertDeviceSql, [
            auditId,
            d.class,
            d.description || null,
            d.power,
            d.quantity,
            d.time,
            d.dailyKwh
          ]);
        }
        await conn.commit();
        const [saved] = await db.query('SELECT audit_id, audit_name, notes, created_at FROM Audits WHERE audit_id = ?', [auditId]);
        return saved[0];
      } catch (err) {
        await conn.rollback();
        throw err;
      } finally {
        conn.release();
      }
    },
    ingestTelemetry: async (_, { csv }) => {
      // Placeholder: accept CSV text from agents; real parser and storage needed.
      // For now just acknowledge receipt.
      console.log('Received telemetry CSV:', csv ? `${csv.substring(0, 100)}...` : '<empty>');
      return true;
    }
  }
};
