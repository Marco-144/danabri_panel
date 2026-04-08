import mysql from 'mysql2/promise';

const pool = mysql.createPool({
    host: 'localhost',
    user: 'root',
    password: '<Y2e7k&95O.@',
    database: 'danabri',
});

export default pool;