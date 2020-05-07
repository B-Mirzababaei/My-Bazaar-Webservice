/*CREATE DATABASE `nodechat` !40100 DEFAULT CHARACTER SET utf8mb4_general_ci; */
CREATE TABLE `message` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `roomid` int(11) NOT NULL,
  `parentid` int(11) DEFAULT NULL COMMENT 'may refer back to another message.',
  `timestamp` datetime NOT NULL,
  `type` varchar(50) NOT NULL COMMENT '"text", "join", "leave", "image" are expected. Other types are possible as extensions.',
  `content` varchar(10000) NOT NULL,
  `username` varchar(100) NOT NULL,
  `useraddress` varchar(100) DEFAULT NULL COMMENT 'some sort of tracking value for the chat user, maybe ip address.',
  `userid` varchar(100) DEFAULT NULL COMMENT 'unique id for a user',
  PRIMARY KEY (`id`)
) AUTO_INCREMENT=423 DEFAULT CHARSET=utf8;


CREATE TABLE `room` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `name` varchar(100) NOT NULL COMMENT 'The name of the chat room',
  `created` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `modified` timestamp NULL DEFAULT NULL COMMENT 'The last time this room was entered by a chat user.', 
  `comment` varchar(10000) DEFAULT NULL,
  `num_users` int(5) NOT NULL DEFAULT 0 COMMENT 'The number of users who joined in this room',
  `available_for_chatroom` int(1) NOT NULL DEFAULT 0 COMMENT 'It is 1 if it is available for chat.',
  `type` varchar(45) NOT NULL COMMENT 'Type of the room',
  `created_by` varchar(100) NOT NULL COMMENT 'the landing page that creates this room',
  PRIMARY KEY (`id`),
  UNIQUE KEY `name_UNIQUE` (`name`)
) AUTO_INCREMENT=316 DEFAULT CHARSET=utf8;

CREATE TABLE `consent` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `roomname` varchar(100) NOT NULL,
  `userid` varchar(100) NOT NULL,
  `consent` tinyint(1) NOT NULL,
  PRIMARY KEY (`id`)
) AUTO_INCREMENT=425 DEFAULT CHARSET=utf8;