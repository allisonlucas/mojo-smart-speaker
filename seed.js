const fetch = require("node-fetch");
const server = require("./server");

// ---------- SEED THE EMPLOYEES AND COMMITS TABLES ---------- //
const employeesQuery = `
    query {
        organization(login: "MojoTech") {
            membersWithRole(first: 1) {
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

const getLast12MonthsCommits = (datesArr, member) => {
  const promises = [];
  for (let i = 0; i < datesArr.length; i++) {
    promises.push(
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
    );
  }
  return Promise.all(promises);
};

server.client.connect(err => {
  if (err) console.log("Error connecting to database: ", err);

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
        server.client.query(
          member.name
            ? `INSERT INTO employees (name, username) VALUES ('${member.name}', '${member.login}');`
            : `INSERT INTO employees (username) VALUES ('${member.login}');`,
          (err, res) => {
            if (err) throw err;
            console.log("Success seeding employees table: ", res);
            getCommits(member);
          }
        );
      });
    })
    .catch(error => console.error("Employees table error: ", error));

  const getCommits = async member => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const lastYear = now.getUTCFullYear() - 1;
    const oneYearAgoFrom = new Date(
      new Date(now.setFullYear(lastYear, currentMonth, 1)).setUTCHours(
        0,
        0,
        0,
        0
      )
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
    await getLast12MonthsCommits(datesArr, member)
      .then(async results => {
        for (let i = 0; i < results.length; i++) {
          const parsed = await results[i].json();

          const month = new Date(datesArr[i].date_from).getUTCMonth();
          const year = new Date(datesArr[i].date_to).getUTCFullYear();

          const restrictedContributions =
            parsed.data.user.contributionsCollection
              .restrictedContributionsCount;
          const unrestrictedContributions =
            parsed.data.user.contributionsCollection.totalCommitContributions;
          const totalContributions =
            restrictedContributions + unrestrictedContributions;
          await new Promise(resolve => {
            server.client.query(
              `INSERT INTO commits (month, year, private, public, total, employee_id) VALUES (${month}, ${year}, ${restrictedContributions}, ${unrestrictedContributions}, ${totalContributions}, (SELECT id from employees WHERE username = '${member.login}'));`,
              (err, res) => {
                if (err) throw err;
                console.log("Success seeding commits table: ", res);
                resolve();
              }
            );
          });
        }
      })
      .then(() => server.client.end())
      .catch(error => console.error("Commits table error: ", error));
  };
});
