const express = require("express");
const graphqlHTTP = require("express-graphql");
const graphql = require("graphql");
const { Client } = require("pg");
require("dotenv").config();
const joinMonster = require("join-monster");
const fetch = require("node-fetch");

// SEED THE EMPLOYEE TABLE
const employeesQuery = `
    query {
        organization(login: "MojoTech") {
            membersWithRole(first: 99) {
                nodes {
                    name
                    login
                }
            }
        }
    }
`;

const commitsQuery = `
    query($login: String!, $date_from: DateTime, $date_to: DateTime) {
        user(login: $login) {
            contributionsCollection(from: $date_from, to: $date_to) {
                restrictedContributionsCount
                totalCommitContributions
            }
        }
    }
`;

fetch("https://api.github.com/graphql", {
  method: "POST",
  body: JSON.stringify({ query: employeesQuery }),
  headers: {
    Authorization: `Bearer ${process.env.GITHUB_TOKEN}`
  }
})
  .then(res => res.json())
  .then(parsed => {
    const members = parsed.data.organization.membersWithRole.nodes;
    members.map(member => {
      client.query(
        member.name
          ? `INSERT INTO employees (name, username) VALUES ('${member.name}', '${member.login}');`
          : `INSERT INTO employees (username) VALUES ('${member.login}');`
      );
      getCommits(member);
    });
  })
  .catch(error => console.error("ERROR: ", error));

const getCommits = member => {
  const now = new Date();
  const currentMonth = now.getMonth();
  const lastYear = now.getUTCFullYear() - 1;
  const oneYearAgoFrom = new Date(
    new Date(now.setFullYear(lastYear, currentMonth, 1)).setUTCHours(0, 0, 0, 0)
  );
  const oneYearAgoTo = new Date(
    new Date(now.setFullYear(lastYear, currentMonth + 1, 0)).setUTCHours(
      23,
      59,
      59,
      999
    )
  );
  const datesArr = [
    {
      date_from: oneYearAgoFrom.toISOString(),
      date_to: oneYearAgoTo.toISOString()
    }
  ];
  for (i = 1; i < 12; i++) {
    datesArr.push({
      date_from: new Date(
        oneYearAgoFrom.setUTCMonth(currentMonth + i)
      ).toISOString(),
      date_to: new Date(
        oneYearAgoTo.setFullYear(lastYear, currentMonth + 1 + i, 0)
      ).toISOString()
    });
  }

  for (i = 0; i < datesArr.length; i++) {
    const month = new Date(datesArr[i].date_from).getUTCMonth();
    const year = new Date(datesArr[i].date_from).getUTCFullYear();

    fetch("https://api.github.com/graphql", {
      method: "POST",
      body: JSON.stringify({
        query: commitsQuery,
        variables: {
          login: member.login,
          ...datesArr[i]
        }
      }),
      headers: {
        Authorization: `Bearer ${process.env.GITHUB_TOKEN}`
      }
    })
      .then(res => res.json())
      .then(parsed => {
        const restrictedContributions =
          parsed.data.user.contributionsCollection.restrictedContributionsCount;
        const unrestrictedContributions =
          parsed.data.user.contributionsCollection.totalCommitContributions;
        const totalContributions =
          restrictedContributions + unrestrictedContributions;
        client.query(
          `INSERT INTO commits (month, year, private, public, total, employee_id) VALUES (${month}, ${year}, ${restrictedContributions}, ${unrestrictedContributions}, ${totalContributions}, (SELECT id from employees WHERE username = '${member.login}'));`
        );
      })
      .catch(error => console.error("ERROR: ", error));
  }
};

// <---------- GRAPHQL SCHEMA/RESOLVER CONNECTION TO POSTGRES DB ---------> //
const Event = new graphql.GraphQLObjectType({
  name: "team_events",
  fields: () => ({
    event_id: { type: graphql.GraphQLInt },
    name: { type: graphql.GraphQLString },
    idea: { type: graphql.GraphQLString },
    details: { type: graphql.GraphQLString }
  })
});

Event._typeConfig = {
  sqlTable: "team_events",
  uniqueKey: "event_id"
};

const client = new Client({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME
});
client.connect();

const QueryRoot = new graphql.GraphQLObjectType({
  name: "Query",
  fields: () => ({
    hello: {
      type: graphql.GraphQLString,
      resolve: () => "Hello world!"
    },
    events: {
      type: new graphql.GraphQLList(Event),
      resolve: (parent, args, context, resolveInfo) => {
        return joinMonster.default(resolveInfo, {}, sql => client.query(sql));
      }
    }
  })
});

const schema = new graphql.GraphQLSchema({ query: QueryRoot });

const app = express();
app.use(
  "/api",
  graphqlHTTP({
    schema: schema,
    graphiql: true
  })
);
app.listen(4000);
