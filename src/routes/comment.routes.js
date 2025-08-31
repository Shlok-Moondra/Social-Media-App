import { Router } from "express";

import {
    content,
    video,
    owner
} from "../controllers/comment.controller.js";

import { upload } from '../middlewares/multer.middleware.js';
import { verifyJWT } from '../middlewares/auth.middleware.js';

const route = Router()


route.route("/content").post(verifyJWT, content);
route.route("/video").post(verifyJWT, video);
route.route("/owner").post(verifyJWT, owner);
