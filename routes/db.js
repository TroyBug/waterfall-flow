//引入mysql模块
var mysql = require('mysql');
var connection;

/**
 * @param options.host {string} 数据库IP
 * @param options.user {string} the account of database
 * @param options.password {string} the password of database
 * @param options.database {string} 需要连接的数据库(test)
 */
function dbConnection(options) {
	connection = mysql.createConnection({
		host: options.host || '127.0.0.1',
		user: options.user,
		password: options.password,
		database: options.database
	});

	//连接成功或失败时会调用此函数
	connection.connect(function(err) {
		if(err) {
			console.log('连接到数据库出错：'+err);
			//失败时自动重新连接
			setTimeout(dbConnection,2000);
		}
	});

	//使用过程中出错会调用此事件
	connection.on('error',function(err) {
		console.log('出错：'+err);
		if(err.code === 'PROTOCOL_CONNECTION_LOST') {
			dbConnection();
		} else {
			throw err;
		}
	});

	//返回数据库连接
	return connection;
}

module.exports = dbConnection;