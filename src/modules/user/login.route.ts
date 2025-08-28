import { Router, Request, Response } from "express";
import {  login, logout } from "./login.controller";
const loginRouter = Router();

loginRouter.post("/login", (req: Request, res: Response) => { login(req, res);
});

loginRouter.post("/logout", (req: Request, res: Response) => { logout(req, res);
});

export default loginRouter;
