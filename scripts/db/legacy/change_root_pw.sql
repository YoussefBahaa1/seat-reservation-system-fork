FLUSH PRIVILEGES;
ALTER USER 'root'@'localhost' IDENTIFIED BY 'new_password';
ALTER USER 'root'@'' IDENTIFIED BY 'new_password';
FLUSH PRIVILEGES;