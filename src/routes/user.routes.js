import {Router} from "express"
import {upload} from "../middlewares/multer.middleware.js"
import {
        loginUser,
        logoutUser, 
        registerUser,
        refreshAccessToken,
        changeCurrentPassword,
        getCurrentUser,
        updateAccountDetails,
        updateUserAvatar,
        updateCoverImage, 
        getUserChannelProfile,
        getWatchHistory
} from "../controllers/user.controller.js"

import { verifyJwt } from "../middlewares/auth.middleware.js"

const router = Router()

router.route("/register").post(
    upload.fields([
        {
            name: "avatar",
            maxCount: 1,
        },

        {
            name: "coverImage",
            maxCount: 1,
        }
    ]),
    registerUser

)


// secured routes
router.route("/logout").post(verifyJwt,logoutUser)

router.route("/login").post(loginUser)

router.route("/refresh-token").post(refreshAccessToken)
export default router

router.route("/change-password").post(verifyJwt,changeCurrentPassword)

router.route("/current-user").get(verifyJwt,getCurrentUser)
router.route("/update-account").patch(verifyJwt,updateAccountDetails)
router.route("/avatar").patch(verifyJwt,upload.single("avatar"),updateUserAvatar)
router.route("/cover-image").patch(verifyJwt,upload.single("coverImage"),updateCoverImage)

router.route("/c/:username").get(verifyJwt,getUserChannelProfile)
router.route("/history").get(verifyJwt,getWatchHistory)