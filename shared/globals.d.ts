import "express-serve-static-core";
declare module 'qrcode';
declare module 'qrcode-terminal';
declare module 'gtts';
declare module 'some-lib-name';
declare module "express-serve-static-core" {
    interface Request {
        userId?: string;
    }
}
