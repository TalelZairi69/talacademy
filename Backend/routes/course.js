const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid'); // For generating unique course codes
const Course = require('../models/Course'); // Import Course model
const User = require('../models/User'); // Import User model
const verifyToken = require('../middleware/auth');
const multer = require('multer');
const path = require('path');
const { s3 } = require('../config/aws'); 
const { Upload } = require('@aws-sdk/lib-storage');
const multerS3 = require('multer-s3');
const mime = require('mime-types');
const Busboy = require('busboy');
const cors = require('cors');


// Add Course Route
router.post('/add', verifyToken, async (req, res) => {
    const { subject, highschool, grade, type, section, group, price } = req.body;
    console.log('Full Request Body:', req.body); // Log the full request body
    

    if (!subject || !grade || !type) {
        console.error('Missing required fields:', { subject, grade, type }); // Debug log
        return res.status(400).json({ message: 'All required fields must be filled.' });
    }

    if (type === 'groupe_d_etude' && (!section || !group)) {
        console.error('Missing fields for Groupe d\'Étude:', { section, group }); // Debug log
        return res.status(400).json({ message: 'Section and group are required for Groupe d\'Étude.' });
    }
    if (type === 'classe_de_lycee' && (!subject || !grade || !highschool || !section)) {
        console.error('Missing required fields for Classe de Lycée:', { subject, grade, highschool, section });
        return res.status(400).json({ message: 'All required fields must be filled for Classe de Lycée.' });
    }

    if (price !== undefined && price < 0) {
        return res.status(400).json({ message: 'Price cannot be negative.' });
    }

    try {
        const user = await User.findById(req.user.id);
        if (!user) return res.status(404).json({ message: 'User not found.' });

        const course = new Course({
            subject,
            grade,
            type,
            highschool: type === 'classe_de_lycee' ? highschool : undefined,
            section: type === 'classe_de_lycee' || type === 'groupe_d_etude' ? section : undefined,
            group: type === 'groupe_d_etude' ? group : undefined,
            courseCode: uuidv4().split('-')[0],
            price: price || 0,
            users: [{ userId: req.user.id, username: user.username, role: 'teacher' }],
        });

        await course.save();
        res.status(201).json({ message: 'Course added successfully!', course });
    } catch (error) {
        console.error('Error adding course:', error); // Debug log
        res.status(500).json({ message: 'Failed to add course.' });
    }
});



// Join Course Route
router.post('/join', verifyToken, async (req, res) => {
    const { courseCode } = req.body;

    if (!courseCode) {
        return res.status(400).json({ message: 'Course code is required.' });
    }

    try {
        const course = await Course.findOne({ courseCode });
        if (!course) {
            return res.status(404).json({ message: 'Course not found.' });
        }

        // Check if user is already in the course
        const userAlreadyInCourse = course.users.some(user => user.userId.toString() === req.user.id);
        if (userAlreadyInCourse) {
            return res.status(400).json({ message: 'You are already enrolled in this course.' });
        }

        // Fetch the user's details
        const user = await User.findById(req.user.id);
        if (!user) {
            return res.status(404).json({ message: 'User not found.' });
        }

        if (user.balance < course.price) {
            return res.status(400).json({ message: 'Insufficient balance to join the course.' });
        }

        // Deduct balance from student and add to teacher
        const teacher = await User.findById(course.users.find(user => user.role === 'teacher').userId);
        if (!teacher) return res.status(404).json({ message: 'Teacher not found.' });

        user.balance -= course.price;
        teacher.balance += course.price;

        await user.save();
        await teacher.save();

        // Add the user to the course with the role of "student"
        course.users.push({ userId: req.user.id, username: user.username, role: 'student' });
        await course.save();

        res.status(200).json({ message: 'Successfully joined the course.', course });
    } catch (error) {
        console.error('Error while joining the course:', error);
        res.status(500).json({ message: 'Failed to join course.' });
    }
});


// Fetch Joined Courses
// Fetch Joined Courses (Exclude Groupe d'Étude)
router.get('/my-courses', verifyToken, async (req, res) => {
    try {
        const courses = await Course.find({
            'users.userId': req.user.id,
            type: 'classe_de_lycee',
        }).select('subject courseCode highschool grade section users');

      
        const enrichedCourses = courses.map((course) => ({
            ...course.toObject(),
            teacher: course.users.find((user) => user.role === 'teacher')?.username || 'Unknown',
        }));

        res.status(200).json(enrichedCourses);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Failed to fetch courses.' });
    }
});


router.get('/students', verifyToken, async (req, res) => {
    try {
        const courses = await Course.find({ 'users.userId': req.user.id, 'users.role': 'teacher' })
            .populate('users.userId', 'username email');

        const data = courses.map(course => ({
            courseName: course.subject,
            courseCode: course.courseCode,
            highschool: course.highschool || 'Non spécifié',
            section: course.section || 'Non spécifié',
            grade: course.grade || 'Non spécifié',
            teacher: course.users.find(user => user.role === 'teacher')?.username || 'Non spécifié',
            students: course.users
                .filter(user => user.role === 'student')
                .map(student => ({
                    username: student.userId?.username,
                    email: student.userId?.email,
                })),
        }));

        res.status(200).json({ data });
    } catch (error) {
        console.error('Failed to fetch students:', error);
        res.status(500).json({ message: 'Failed to fetch students.' });
    }
});


// Fetch Joined Groupe d'Étude Courses
router.get('/my-study-groups', verifyToken, async (req, res) => {
    try {
        const studyGroups = await Course.find({
            'users.userId': req.user.id,
            type: 'groupe_d_etude',
        }).select('subject courseCode section group grade users');

       
        const enrichedStudyGroups = studyGroups.map((course) => ({
            ...course.toObject(),
            teacher: course.users.find((user) => user.role === 'teacher')?.username || 'Unknown',
        }));

        res.status(200).json(enrichedStudyGroups);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Failed to fetch Groupe d\'Étude courses.' });
    }
});
// Fetch Specific Course by Code
// Fetch Specific Course by Code
router.get('/:courseCode', verifyToken, async (req, res) => {
    const { courseCode } = req.params;

    try {
        const course = await Course.findOne({ courseCode });

        if (!course) {
            return res.status(404).json({ message: 'Course not found.' });
        }

        const courseData = {
            subject: course.subject,
            highschool: course.highschool || 'Non spécifié',
            grade: course.grade || 'Non spécifié',
            section: course.section || 'Non spécifié',
            group: course.group || 'Non spécifié',
            teacher: course.users.find(user => user.role === 'teacher')?.username || 'Unknown',
            students: course.users.filter(user => user.role === 'student').map(user => ({
                username: user.username,
            })),
            content: course.content || [], // Include content here
        };

        res.status(200).json(courseData);
    } catch (error) {
        console.error('Failed to fetch course details:', error);
        res.status(500).json({ message: 'Failed to fetch course details.' });
    }
});

const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, 'uploads/'),
    filename: (req, file, cb) => {
        const ext = path.extname(file.originalname); // Extract original file extension
        cb(null, `${Date.now()}-${file.originalname}`); // Save with original extension
    },
});


const upload = multer();

router.post('/:courseCode/upload', verifyToken, async (req, res) => {
    const { courseCode } = req.params;

    // Fetch the course
    let course;
    try {
        course = await Course.findOne({ courseCode });
        if (!course) {
            return res.status(404).json({ message: 'Course not found.' });
        }
    } catch (error) {
        console.error('Error fetching course:', error);
        return res.status(500).json({ message: 'Failed to fetch course.' });
    }

    // Initialize Busboy
    const busboy = Busboy({ headers: req.headers });


    let uploadProgress = 0;
    let totalFileSize = parseInt(req.headers['content-length'], 10);
    let uploadedFileUrl = '';
    let title = '';
    let type = '';

    busboy.on('field', (fieldname, val) => {
        if (fieldname === 'title') title = val;
        if (fieldname === 'type') type = val;
    });

    busboy.on('file', (fieldname, file, info) => {
        const { filename, mimeType } = info;
        const fileName = `${Date.now()}-${filename}`;
    
        const upload = new Upload({
            client: s3,
            params: {
                Bucket: process.env.AWS_BUCKET_NAME,
                Key: fileName,
                Body: file,
                ContentType: mimeType,
                ContentDisposition: 'inline',
            },
        });
    
        file.on('data', (chunk) => {
            uploadProgress += chunk.length;
            console.log(`Progress: ${((uploadProgress / totalFileSize) * 100).toFixed(2)}%`);
        });
    
        uploadPromise = upload.done()
            .then((data) => {
                uploadedFileUrl = data.Location;
                console.log('File successfully uploaded to S3:', uploadedFileUrl);
            })
            .catch((err) => {
                console.error('S3 Upload Error:', err);
                throw new Error('Failed to upload file to S3');
            });
    });
    
    busboy.on('finish', async () => {
        try {
            // Ensure the upload completes
            await uploadPromise;
    
            if (!uploadedFileUrl) {
                return res.status(400).json({ message: 'No file uploaded or upload failed.' });
            }
    
            const content = {
                title,
                type,
                url: uploadedFileUrl,
                uploadedBy: req.user.id,
            };
    
            course.content.push(content);
            await course.save();
    
            res.status(201).json({ message: 'File uploaded successfully!', content });
        } catch (error) {
            console.error('Error during upload finish:', error);
            res.status(500).json({ message: 'Failed to save file to course.', error });
        }
    });
    req.pipe(busboy);
});





const uploadToS3 = async (file) => {
    const upload = new Upload({
        client: s3,
        params: {
            Bucket: process.env.AWS_BUCKET_NAME,
            Key: `${Date.now()}-${file.originalname}`, // Unique file name
            Body: file.buffer, // File content
            ContentType: mime.lookup(file.originalname) || 'application/octet-stream', // Auto-detect MIME type
            ContentDisposition: 'inline', // Ensure inline preview
        },
    });

    try {
        const data = await upload.done();
        return data.Location; // The URL of the uploaded file
    } catch (err) {
        console.error('S3 Upload Error:', err);
        throw err;
    }
};


module.exports = router;
