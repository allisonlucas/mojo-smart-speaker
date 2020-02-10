/* Drop all tables */
DROP TABLE IF EXISTS commits;
DROP TABLE IF EXISTS employees;

/* Create employees table */
CREATE TABLE employees (id serial PRIMARY KEY, name varchar, username varchar NOT NULL, CONSTRAINT username_unique UNIQUE (username));

/* Create commits table */
CREATE TABLE commits (id serial PRIMARY KEY, month int NOT NULL, year int NOT NULL, private int NOT NULL, public int NOT NULL, total int NOT NULL, employee_id int NOT NULL, CONSTRAINT employee_id_foreign_key FOREIGN KEY (employee_id) REFERENCES employees(id));
