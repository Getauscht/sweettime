-- Drop legacy plaintext TOTP secret column
ALTER TABLE `User` DROP COLUMN IF EXISTS `totpSecret`;
