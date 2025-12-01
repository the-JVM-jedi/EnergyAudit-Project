const { gql } = require('apollo-server');

module.exports = gql`
  type Device {
    id: ID!
    audit_id: Int!
    device_class: String
    description: String
    power_rating_watts: Int
    quantity: Int
    hours_per_day: Float
    daily_kwh_total: Float
  }

  type Audit {
    audit_id: ID!
    audit_name: String!
    notes: String
    created_at: String
    devices: [Device!]
  }

  input DeviceInput {
    class: String!
    description: String
    power: Int!
    quantity: Int!
    time: Float!
    dailyKwh: Float!
  }

  type Query {
    audits: [Audit!]
    audit(id: ID!): Audit
  }

  type Mutation {
    saveAudit(auditName: String!, notes: String, devices: [DeviceInput!]!): Audit
    ingestTelemetry(csv: String!): Boolean
  }
`;
