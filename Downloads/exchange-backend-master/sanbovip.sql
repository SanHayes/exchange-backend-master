/*
 Navicat Premium Data Transfer

 Source Server         : linux-dung
 Source Server Type    : MySQL
 Source Server Version : 80028
 Source Host           : 128.199.96.244:3306
 Source Schema         : sanbovip

 Target Server Type    : MySQL
 Target Server Version : 80028
 File Encoding         : 65001

 Date: 30/03/2022 09:23:51
*/

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;
SET GLOBAL time_zone = "+07:00";

-- ----------------------------
-- Table structure for account
-- ----------------------------
DROP TABLE IF EXISTS `account`;
CREATE TABLE `account` (
  `id` int NOT NULL AUTO_INCREMENT,
  `email` varchar(255) DEFAULT NULL,
  `u_id` varchar(255) DEFAULT NULL,
  `type` int DEFAULT '0',
  `win` decimal(20,4) DEFAULT '0.0000',
  `lose` decimal(20,4) DEFAULT '0.0000',
  `balance` decimal(20,4) DEFAULT '0.0000',
  `deposit` int DEFAULT '0',
  `withdrawal` int DEFAULT '0',
  `order_amount` decimal(20,4) DEFAULT '0.0000',
  `created_at` varchar(255) DEFAULT NULL,
  `updated_at` varchar(255) DEFAULT NULL,
  `deleted_at` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`id`) USING BTREE
) ENGINE=InnoDB AUTO_INCREMENT=497 DEFAULT CHARSET=utf8mb3 ROW_FORMAT=DYNAMIC;

-- ----------------------------
-- Table structure for add_money_history
-- ----------------------------
DROP TABLE IF EXISTS `add_money_history`;
CREATE TABLE `add_money_history` (
  `id` int NOT NULL AUTO_INCREMENT,
  `nick_name` varchar(255) DEFAULT NULL,
  `email` varchar(255) DEFAULT NULL,
  `type` int DEFAULT '0',
  `price_USDT` decimal(20,4) DEFAULT '0.0000',
  `price_ETH` decimal(20,4) DEFAULT '0.0000',
  `price_BTC` decimal(20,4) DEFAULT '0.0000',
  `price_VN` decimal(20,4) DEFAULT '0.0000',
  `price_PAYPAL` decimal(20,4) DEFAULT '0.0000',
  `created_at` varchar(255) DEFAULT NULL,
  `updated_at` varchar(255) DEFAULT NULL,
  `deleted_at` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`id`) USING BTREE
) ENGINE=InnoDB AUTO_INCREMENT=126 DEFAULT CHARSET=utf8mb3 ROW_FORMAT=DYNAMIC;

-- ----------------------------
-- Table structure for bet_history
-- ----------------------------
DROP TABLE IF EXISTS `bet_history`;
CREATE TABLE `bet_history` (
  `id` int NOT NULL AUTO_INCREMENT,
  `email` varchar(255) DEFAULT NULL,
  `id_account` varchar(255) DEFAULT NULL,
  `type_account` int DEFAULT '0',
  `buy_sell` varchar(255) DEFAULT NULL,
  `currency` varchar(255) DEFAULT NULL,
  `amount_win` decimal(20,4) DEFAULT '0.0000',
  `amount_lose` decimal(20,4) DEFAULT '0.0000',
  `amount_bet` decimal(20,4) DEFAULT '0.0000',
  `open` decimal(20,4) DEFAULT '0.0000',
  `close` decimal(20,4) DEFAULT '0.0000',
  `session` int NOT NULL DEFAULT '0',
  `marketing` int DEFAULT '0',
  `status` int DEFAULT '1',
  `created_at` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`id`) USING BTREE
) ENGINE=InnoDB AUTO_INCREMENT=773 DEFAULT CHARSET=utf8mb3 ROW_FORMAT=DYNAMIC;

-- ----------------------------
-- Table structure for champions
-- ----------------------------
DROP TABLE IF EXISTS `champions`;
CREATE TABLE `champions` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(255) NOT NULL,
  `dateStart` varchar(255) NOT NULL,
  `dateEnd` varchar(255) NOT NULL,
  `type` varchar(255) CHARACTER SET utf8 COLLATE utf8_general_ci NOT NULL,
  `content` text CHARACTER SET utf8 COLLATE utf8_general_ci NOT NULL,
  `delete_status` int DEFAULT '-1',
  `totalRewards` text CHARACTER SET utf8 COLLATE utf8_general_ci,
  `background` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=22 DEFAULT CHARSET=utf8mb3;

-- ----------------------------
-- Table structure for commission_history
-- ----------------------------
DROP TABLE IF EXISTS `commission_history`;
CREATE TABLE `commission_history` (
  `id` int NOT NULL AUTO_INCREMENT,
  `email` varchar(255) DEFAULT NULL,
  `from_upid` varchar(255) DEFAULT NULL,
  `ref_id` varchar(255) DEFAULT NULL,
  `upline_id` varchar(255) DEFAULT NULL,
  `pending_commission` decimal(20,4) DEFAULT '0.0000',
  `personal_trading_volume` decimal(20,4) DEFAULT '0.0000',
  `vip_commission` varchar(20) DEFAULT '0',
  `type` varchar(255) DEFAULT NULL,
  `marketing` int DEFAULT '0',
  `session` int DEFAULT '0',
  `created_at` varchar(255) DEFAULT NULL,
  `status` int DEFAULT '1',
  PRIMARY KEY (`id`) USING BTREE
) ENGINE=InnoDB AUTO_INCREMENT=1018 DEFAULT CHARSET=utf8mb3 ROW_FORMAT=DYNAMIC;

-- ----------------------------
-- Table structure for exchange_history
-- ----------------------------
DROP TABLE IF EXISTS `exchange_history`;
CREATE TABLE `exchange_history` (
  `id` int NOT NULL AUTO_INCREMENT,
  `email` varchar(255) DEFAULT NULL,
  `nick_name` varchar(255) DEFAULT NULL,
  `from_e` varchar(255) DEFAULT NULL,
  `to_e` varchar(255) DEFAULT NULL,
  `send` varchar(255) DEFAULT NULL,
  `receive` varchar(255) DEFAULT NULL,
  `status` int DEFAULT '0',
  `delete_status` int DEFAULT '0',
  `created_at` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`id`) USING BTREE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3 ROW_FORMAT=DYNAMIC;

-- ----------------------------
-- Table structure for lucky_draw
-- ----------------------------
DROP TABLE IF EXISTS `lucky_draw`;
CREATE TABLE `lucky_draw` (
  `id` int NOT NULL AUTO_INCREMENT,
  `email` text CHARACTER SET utf8 COLLATE utf8_general_ci,
  `nickname` text CHARACTER SET utf8 COLLATE utf8_general_ci,
  `type` varchar(255) DEFAULT NULL,
  `day` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=20 DEFAULT CHARSET=utf8mb3;

-- ----------------------------
-- Table structure for notifi
-- ----------------------------
DROP TABLE IF EXISTS `notifi`;
CREATE TABLE `notifi` (
  `id` int NOT NULL AUTO_INCREMENT,
  `cu_email` varchar(255) DEFAULT NULL,
  `email` varchar(255) DEFAULT NULL,
  `content` varchar(255) DEFAULT NULL,
  `title` varchar(255) DEFAULT NULL,
  `views` int DEFAULT '0',
  `created_at` varchar(255) DEFAULT NULL,
  `type` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`id`) USING BTREE
) ENGINE=InnoDB AUTO_INCREMENT=160 DEFAULT CHARSET=utf8mb3 ROW_FORMAT=DYNAMIC;

-- ----------------------------
-- Table structure for telegram
-- ----------------------------
DROP TABLE IF EXISTS `telegram`;
CREATE TABLE `telegram` (
  `id` int NOT NULL AUTO_INCREMENT,
  `form` varchar(255) DEFAULT NULL,
  `email` varchar(255) DEFAULT NULL,
  `phone` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`id`) USING BTREE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3 ROW_FORMAT=DYNAMIC;

-- ----------------------------
-- Table structure for trade_history
-- ----------------------------
DROP TABLE IF EXISTS `trade_history`;
CREATE TABLE `trade_history` (
  `id` int NOT NULL AUTO_INCREMENT,
  `email` varchar(255) DEFAULT NULL,
  `from_u` varchar(255) DEFAULT NULL,
  `to_u` varchar(255) DEFAULT NULL,
  `type_key` varchar(255) DEFAULT NULL,
  `type` varchar(255) DEFAULT NULL,
  `network` varchar(255) DEFAULT NULL,
  `paypal` decimal(20,4) DEFAULT '0.0000',
  `paypal_order_id` decimal(20,4) DEFAULT '0.0000',
  `pay_fee` decimal(20,4) DEFAULT '0.0000',
  `fee_withdraw` decimal(20,4) DEFAULT '0.0000',
  `currency` varchar(255) DEFAULT NULL,
  `amount` decimal(20,4) DEFAULT '0.0000',
  `real_amount` decimal(20,4) DEFAULT '0.0000',
  `note` varchar(255) DEFAULT NULL,
  `status` int DEFAULT '0',
  `delete_status` int DEFAULT '0',
  `created_at` varchar(255) DEFAULT NULL,
  `bank` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`id`) USING BTREE
) ENGINE=InnoDB AUTO_INCREMENT=464 DEFAULT CHARSET=utf8mb3 ROW_FORMAT=DYNAMIC;

-- ----------------------------
-- Table structure for users
-- ----------------------------
DROP TABLE IF EXISTS `users`;
CREATE TABLE `users` (
  `id` int NOT NULL AUTO_INCREMENT,
  `email` varchar(255) DEFAULT NULL,
  `password` varchar(255) DEFAULT NULL,
  `permissions` varchar(255) DEFAULT NULL,
  `last_login` varchar(255) DEFAULT NULL,
  `ref_code` varchar(255) DEFAULT NULL,
  `nick_name` varchar(255) DEFAULT NULL,
  `upline_id` varchar(255) DEFAULT NULL,
  `first_name` varchar(255) DEFAULT NULL,
  `last_name` varchar(255) DEFAULT NULL,
  `username` varchar(255) DEFAULT NULL,
  `address` varchar(255) DEFAULT NULL,
  `secondary_address` varchar(255) DEFAULT NULL,
  `job_position` varchar(255) DEFAULT NULL,
  `phone` varchar(255) DEFAULT NULL,
  `secondary_phone` varchar(255) DEFAULT NULL,
  `secondary_email` varchar(255) DEFAULT NULL,
  `gender` varchar(255) DEFAULT NULL,
  `website` varchar(255) DEFAULT NULL,
  `skype` varchar(255) DEFAULT NULL,
  `facebook` varchar(255) DEFAULT NULL,
  `twitter` varchar(255) DEFAULT NULL,
  `google_plus` varchar(255) DEFAULT NULL,
  `youtube` varchar(255) DEFAULT NULL,
  `github` varchar(255) DEFAULT NULL,
  `interest` varchar(255) DEFAULT NULL,
  `about` varchar(255) DEFAULT NULL,
  `profile_image` varchar(255) DEFAULT NULL,
  `personal_quota` varchar(255) DEFAULT NULL,
  `active` int DEFAULT '0',
  `verified` int DEFAULT '0',
  `super_user` int DEFAULT '0',
  `manage_supers` int DEFAULT '0',
  `offer_account` int DEFAULT '0',
  `money_eth` decimal(20,4) DEFAULT '0.0000',
  `money_btc` decimal(20,4) DEFAULT '0.0000',
  `money_usdt` decimal(20,4) DEFAULT '0.0000',
  `money_vn` decimal(20,4) DEFAULT '0.0000',
  `money_paypal` decimal(20,4) DEFAULT '0.0000',
  `money_deposit` decimal(20,4) DEFAULT '0.0000',
  `money_withdrawal` decimal(20,4) DEFAULT '0.0000',
  `super_account` int DEFAULT '0',
  `wallet_his` varchar(255) DEFAULT NULL,
  `wallet_order_offer` decimal(20,2) DEFAULT NULL,
  `sponsor` varchar(255) DEFAULT NULL,
  `money_wallet_his` decimal(20,4) DEFAULT '0.0000',
  `vip_user` int DEFAULT '0',
  `level_vip` int DEFAULT '0',
  `id_front` varchar(255) DEFAULT NULL,
  `id_back` varchar(255) DEFAULT NULL,
  `pending_commission` int DEFAULT '0',
  `commission_vip` int DEFAULT '0',
  `commission_update` varchar(255) DEFAULT NULL,
  `address_BTC` varchar(255) DEFAULT NULL,
  `address_ETH` varchar(255) DEFAULT NULL,
  `address_USDT` varchar(255) DEFAULT NULL,
  `privateKey_BTC` varchar(255) DEFAULT NULL,
  `privateKey_ETH` varchar(255) DEFAULT NULL,
  `privateKey_USDT` varchar(255) DEFAULT NULL,
  `wif_BTC` varchar(255) DEFAULT NULL,
  `completed_profile` int DEFAULT '0',
  `active_2fa` int DEFAULT '0',
  `secret_2fa` varchar(255) DEFAULT NULL,
  `code_secure` varchar(255) DEFAULT NULL,
  `pricePlay` decimal(20,4) DEFAULT '0.0000',
  `priceWin` decimal(20,4) DEFAULT '0.0000',
  `priceLose` decimal(20,4) DEFAULT '0.0000',
  `marketing` int DEFAULT '0',
  `so_cmnd` varchar(255) DEFAULT NULL,
  `language` varchar(255) DEFAULT NULL,
  `country` varchar(255) DEFAULT NULL,
  `created_at` varchar(255) DEFAULT NULL,
  `updated_at` varchar(255) DEFAULT NULL,
  `deleted_at` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`id`) USING BTREE
) ENGINE=InnoDB AUTO_INCREMENT=553 DEFAULT CHARSET=utf8mb3 ROW_FORMAT=DYNAMIC;

-- ----------------------------
-- Records of users
-- ----------------------------
BEGIN;
INSERT INTO `users` (`id`, `email`, `password`, `permissions`, `last_login`, `ref_code`, `nick_name`, `upline_id`, `first_name`, `last_name`, `username`, `address`, `secondary_address`, `job_position`, `phone`, `secondary_phone`, `secondary_email`, `gender`, `website`, `skype`, `facebook`, `twitter`, `google_plus`, `youtube`, `github`, `interest`, `about`, `profile_image`, `personal_quota`, `active`, `verified`, `super_user`, `manage_supers`, `offer_account`, `money_eth`, `money_btc`, `money_usdt`, `money_vn`, `money_paypal`, `money_deposit`, `money_withdrawal`, `super_account`, `wallet_his`, `wallet_order_offer`, `sponsor`, `money_wallet_his`, `vip_user`, `level_vip`, `id_front`, `id_back`, `pending_commission`, `commission_vip`, `commission_update`, `address_BTC`, `address_ETH`, `address_USDT`, `privateKey_BTC`, `privateKey_ETH`, `privateKey_USDT`, `wif_BTC`, `completed_profile`, `active_2fa`, `secret_2fa`, `code_secure`, `pricePlay`, `priceWin`, `priceLose`, `marketing`, `so_cmnd`, `language`, `country`, `created_at`, `updated_at`, `deleted_at`) VALUES (1, 'arres@gmail.com', '$2a$12$zQ4YiBi5rHvg2WYgkxEir.jwvp4i8f.S1y8BjSLKL/ddzft3hxi0e', NULL, NULL, NULL, 'SkyPlaza', NULL, 'BO', 'Ares', 'admin', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '', '104857600', 1, 1, 1, 1, 0, 0.0000, 0.0000, 0.0000, 0.0000, 0.0000, 0.0000, 0.0000, NULL, NULL, 0.00, NULL, 0.0000, 0, 0, NULL, NULL, 0, 0, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 0, 0, NULL, NULL, 0.0000, 0.0000, 0.0000, 0, NULL, NULL, NULL, '13/4/2021 18:16:38', '14/4/2021 20:08:36', NULL);
COMMIT;

SET FOREIGN_KEY_CHECKS = 1;
