import express from 'express';
import User from '../model/userroom.js';
import UserPhoto from '../model/userPhoto.js';
import multer from 'multer';
import path from 'path';

const router = express.Router();

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'uploads/');
    },
    filename: function (req, file, cb) {
        cb(null, Date.now() + path.extname(file.originalname));
    }
});

const upload = multer({ storage: storage });

router.post('/upload-user-photo', upload.single('photo'), async (req, res) => {
    try {
        const { email } = req.body;
        const photoUrl = `/uploads/${req.file.filename}`;

        const user = await User.findOne({ email });
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        const newPhoto = new UserPhoto({
            userId: user._id,
            url: photoUrl,
        });

        await newPhoto.save();

        if (!user.photos) {
            user.photos = [];
        }
        user.photos.push(newPhoto._id);
        await user.save();

        res.json({ success: true, message: 'Photo uploaded successfully', photo: newPhoto });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

router.get('/user-photos/:email', async (req, res) => {
    try {
        const user = await User.findOne({ email: req.params.email }).populate('photos');
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }
        res.json({ success: true, photos: user.photos });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

router.delete('/user-photo/:photoId', async (req, res) => {
    try {
        const { email } = req.body;
        const { photoId } = req.params;

        const user = await User.findOne({ email });
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        await UserPhoto.findByIdAndDelete(photoId);

        user.photos.pull(photoId);
        await user.save();

        res.json({ success: true, message: 'Photo deleted successfully' });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

router.post('/user-photos/reorder', async (req, res) => {
    try {
        const { email, photoIds } = req.body;
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }
        user.photos = photoIds;
        await user.save();
        res.json({ success: true, message: 'Photo order updated' });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

export default router;