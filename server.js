const express = require("express");
const graphqlHTTP = require("express-graphql");
const graphql = require("graphql");
const { Client } = require("pg");
require("dotenv").config();
const joinMonster = require("join-monster");
const fetch = require("node-fetch");

const client = new Client({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME
});

exports.client = client;

// <---------- GRAPHQL SCHEMA/RESOLVER CONNECTION TO POSTGRES DB ---------> //
// const Event = new graphql.GraphQLObjectType({
//   name: "team_events",
//   fields: () => ({
//     event_id: { type: graphql.GraphQLInt },
//     name: { type: graphql.GraphQLString },
//     idea: { type: graphql.GraphQLString },
//     details: { type: graphql.GraphQLString }
//   })
// });

// Event._typeConfig = {
//   sqlTable: "team_events",
//   uniqueKey: "event_id"
// };

// const QueryRoot = new graphql.GraphQLObjectType({
//   name: "Query",
//   fields: () => ({
//     hello: {
//       type: graphql.GraphQLString,
//       resolve: () => "Hello world!"
//     },
//     events: {
//       type: new graphql.GraphQLList(Event),
//       resolve: (parent, args, context, resolveInfo) => {
//         return joinMonster.default(resolveInfo, {}, sql => client.query(sql));
//       }
//     }
//   })
// });

// const schema = new graphql.GraphQLSchema({ query: QueryRoot });

// const app = express();
// app.use(
//   "/api",
//   graphqlHTTP({
//     schema: schema,
//     graphiql: true
//   })
// );
// app.listen(4000);
