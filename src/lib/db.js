import mysql from 'mysql2/promise';

const pool = mysql.createPool({
    host: 'localhost',
    user: 'root',
    password: 'Wizard12!',
    database: 'danabri',
});

export default pool;