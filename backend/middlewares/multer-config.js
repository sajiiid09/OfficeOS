const multer = require('multer');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

const BASE_STORAGE = path.join(__dirname, '..', 'public', 'storage');
const MAX_IMAGE_SIZE = 5 * 1024 * 1024;   // 5 MB
const MAX_FILE_SIZE = 10 * 1024 * 1024;   // 10 MB
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/jpg', 'image/webp', 'image/gif', 'image/svg+xml'];
const FILE_UPLOAD_FIELDS = ['taskFile', 'chatFile'];

const STORAGE_SUBDIRS = [
    'images/profile',
    'images/teams',
    'images/problems',
    'files/tasks',
    'files/chat',
];

const ensureDir = (dir) => {
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
};

// Create storage directories on startup
STORAGE_SUBDIRS.forEach((sub) => ensureDir(path.join(BASE_STORAGE, sub)));

const resolveFolder = (req) => {
    const url = `${req.baseUrl || ''}${req.path || ''}`.toLowerCase();
    if (url.includes('/admin/team') || url.includes('/teams'))  return 'images/teams';
    if (url.includes('/problem') || url.includes('/problems'))  return 'images/problems';
    if (url.includes('/chat'))                                   return 'files/chat';
    if (url.includes('/task') || url.includes('/tasks'))         return 'files/tasks';
    return 'images/profile';
};

const generateUniqueFilename = (originalname) => {
    const ext = path.extname(originalname);
    return `${Date.now()}-${crypto.randomBytes(8).toString('hex')}${ext}`;
};

const imageFilter = (_req, file, cb) => {
    if (ALLOWED_IMAGE_TYPES.includes(file.mimetype)) return cb(null, true);
    cb(new Error('Invalid file type. Only image files are allowed.'), false);
};

const anyFilter = (_req, _file, cb) => cb(null, true);

/**
 * Multer disk storage engine.
 *
 * Files are written to backend/public/storage/<sub-folder>/<unique-filename>.
 * After multer runs, `req.file.path` contains the relative storage path
 * (e.g. `images/profile/1700000000-abc123de.jpg`) so controllers can store
 * it directly in MongoDB and serve it via `${BASE_URL}/storage/<path>`.
 */
const storage = multer.diskStorage({
    destination: (req, _file, cb) => {
        const folder = resolveFolder(req);
        const dest = path.join(BASE_STORAGE, folder);
        ensureDir(dest);
        req.uploadFolder = folder;
        cb(null, dest);
    },
    filename: (req, file, cb) => {
        const name = generateUniqueFilename(file.originalname);
        req.uploadRelativePath = `${req.uploadFolder}/${name}`;
        cb(null, name);
    },
});

const buildUpload = (filterFn, sizeLimit) =>
    multer({ storage, fileFilter: filterFn, limits: { fileSize: sizeLimit } });

const imageUpload = buildUpload(imageFilter, MAX_IMAGE_SIZE);
const fileUpload  = buildUpload(anyFilter, MAX_FILE_SIZE);

const upload = {
    single: (fieldName) => (req, res, next) => {
        const isFile = FILE_UPLOAD_FIELDS.includes(fieldName);
        const uploader = isFile ? fileUpload : imageUpload;

        uploader.single(fieldName)(req, res, (err) => {
            if (err) return next(err);
            if (req.file && req.uploadRelativePath) {
                req.file.path = req.uploadRelativePath;
            }
            next();
        });
    },
};

module.exports = upload;
