CREATE USER 'sneezy'@'sneezy.sneezymuddocker_default' IDENTIFIED BY 'password';
CREATE USER 'sneezy'@'localhost' IDENTIFIED BY 'password';

CREATE DATABASE IF NOT EXISTS immortal CHARACTER SET utf8 COLLATE utf8_general_ci;
--GRANT ALL ON immortal.* to 'sneezy'@'sneezy.sneezymuddocker_default';
--GRANT ALL ON immortal.* to 'sneezy'@'localhost';
GRANT ALL ON immortal.* to 'sneezy'@'%';

CREATE DATABASE IF NOT EXISTS sneezy CHARACTER SET utf8 COLLATE utf8_general_ci;
--GRANT ALL ON sneezy.* to 'sneezy'@'sneezy.sneezymuddocker_default';
--GRANT ALL ON sneezy.* to 'sneezy'@'localhost';
GRANT ALL ON sneezy.* to 'sneezy'@'%';