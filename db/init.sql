CREATE USER IF NOT EXISTS 'sneezy'@'%' IDENTIFIED BY 'password';

CREATE DATABASE IF NOT EXISTS immortal CHARACTER SET utf8 COLLATE utf8_general_ci;
GRANT ALL ON immortal.* to 'sneezy'@'%';

CREATE DATABASE IF NOT EXISTS sneezy CHARACTER SET utf8 COLLATE utf8_general_ci;
GRANT ALL ON sneezy.* to 'sneezy'@'%';