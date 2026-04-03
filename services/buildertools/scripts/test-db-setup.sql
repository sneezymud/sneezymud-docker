-- Create test databases with schemas copied from the real databases.
-- Requires root/admin access to create databases and grant permissions.
-- Re-runnable (safe to run again if source schemas change):
--   sudo mariadb < scripts/test-db-setup.sql

CREATE DATABASE IF NOT EXISTS immortal_test;
CREATE DATABASE IF NOT EXISTS sneezy_test;

-- immortal tables (builder workspace - read/write)
DROP TABLE IF EXISTS immortal_test.mobresponses;
DROP TABLE IF EXISTS immortal_test.mob_imm;
DROP TABLE IF EXISTS immortal_test.mob_extra;
DROP TABLE IF EXISTS immortal_test.mob;
DROP TABLE IF EXISTS immortal_test.objaffect;
DROP TABLE IF EXISTS immortal_test.objextra;
DROP TABLE IF EXISTS immortal_test.obj;
DROP TABLE IF EXISTS immortal_test.roomextra;
DROP TABLE IF EXISTS immortal_test.roomexit;
DROP TABLE IF EXISTS immortal_test.room;

CREATE TABLE immortal_test.room LIKE immortal.room;
CREATE TABLE immortal_test.roomexit LIKE immortal.roomexit;
CREATE TABLE immortal_test.roomextra LIKE immortal.roomextra;
CREATE TABLE immortal_test.obj LIKE immortal.obj;
CREATE TABLE immortal_test.objaffect LIKE immortal.objaffect;
CREATE TABLE immortal_test.objextra LIKE immortal.objextra;
CREATE TABLE immortal_test.mob LIKE immortal.mob;
CREATE TABLE immortal_test.mob_extra LIKE immortal.mob_extra;
CREATE TABLE immortal_test.mob_imm LIKE immortal.mob_imm;
CREATE TABLE immortal_test.mobresponses LIKE immortal.mobresponses;

-- sneezy tables (game database - publish targets + auth)
DROP TABLE IF EXISTS sneezy_test.wizpower;
DROP TABLE IF EXISTS sneezy_test.wizdata;
DROP TABLE IF EXISTS sneezy_test.player;
DROP TABLE IF EXISTS sneezy_test.account;
DROP TABLE IF EXISTS sneezy_test.zone;
DROP TABLE IF EXISTS sneezy_test.mobresponses;
DROP TABLE IF EXISTS sneezy_test.mob_imm;
DROP TABLE IF EXISTS sneezy_test.mob_extra;
DROP TABLE IF EXISTS sneezy_test.mob;
DROP TABLE IF EXISTS sneezy_test.objaffect;
DROP TABLE IF EXISTS sneezy_test.objextra;
DROP TABLE IF EXISTS sneezy_test.obj;
DROP TABLE IF EXISTS sneezy_test.roomextra;
DROP TABLE IF EXISTS sneezy_test.roomexit;
DROP TABLE IF EXISTS sneezy_test.room;

CREATE TABLE sneezy_test.account LIKE sneezy.account;
CREATE TABLE sneezy_test.player LIKE sneezy.player;
CREATE TABLE sneezy_test.wizdata LIKE sneezy.wizdata;
CREATE TABLE sneezy_test.wizpower LIKE sneezy.wizpower;
CREATE TABLE sneezy_test.zone LIKE sneezy.zone;
CREATE TABLE sneezy_test.room LIKE sneezy.room;
CREATE TABLE sneezy_test.roomexit LIKE sneezy.roomexit;
CREATE TABLE sneezy_test.roomextra LIKE sneezy.roomextra;
CREATE TABLE sneezy_test.obj LIKE sneezy.obj;
CREATE TABLE sneezy_test.objaffect LIKE sneezy.objaffect;
CREATE TABLE sneezy_test.objextra LIKE sneezy.objextra;
CREATE TABLE sneezy_test.mob LIKE sneezy.mob;
CREATE TABLE sneezy_test.mob_extra LIKE sneezy.mob_extra;
CREATE TABLE sneezy_test.mob_imm LIKE sneezy.mob_imm;
CREATE TABLE sneezy_test.mobresponses LIKE sneezy.mobresponses;

-- Grant the app's DB user full access to test databases
GRANT ALL PRIVILEGES ON immortal_test.* TO 'sneezy'@'localhost';
GRANT ALL PRIVILEGES ON sneezy_test.* TO 'sneezy'@'localhost';
GRANT ALL PRIVILEGES ON immortal_test.* TO 'sneezy'@'%';
GRANT ALL PRIVILEGES ON sneezy_test.* TO 'sneezy'@'%';
FLUSH PRIVILEGES;
