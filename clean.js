const server = require("./server");

// ---------- DELETE AND RECREATE THE EMPLOYEES AND COMMITS TABLES ---------- //
// ---------- WARNING: This will delete all data from the database ---------- //
const cleanQuery = {
  text:
    "DROP TABLE IF EXISTS commits; DROP TABLE IF EXISTS employees; CREATE TABLE employees (id serial PRIMARY KEY, name varchar, username varchar NOT NULL, CONSTRAINT username_unique UNIQUE (username)); CREATE TABLE commits (id serial PRIMARY KEY, month int NOT NULL, year int NOT NULL, private int NOT NULL, public int NOT NULL, total int NOT NULL, employee_id int NOT NULL, CONSTRAINT employee_id_foreign_key FOREIGN KEY (employee_id) REFERENCES employees(id));"
};

server.client.connect(err => {
  if (err) console.log("Error connecting to database: ", err);
  server.client.query(cleanQuery, (err, res) => {
    if (err) throw err;
    console.log("Success cleaning database: ", res);
    server.client.end();
  });
});
