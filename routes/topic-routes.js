const express = require('express');
const { check } = require('express-validator');

const topicControllers = require('../controllers/topic-controllers');

const router = express.Router();

router.get('/', topicControllers.getTopics);

// router.get('/:id', topicControllers.getTopicsByStudent);

router.post('/create-topic',
    [
        check('topic')
            .isLength({ min: 3 }),
        check('lessonDate')
            .not()
            .isEmpty(),
        check('groupId')
            .not()
            .isEmpty(),
        check('teacherId')
            .not()
            .isEmpty()
    ],
    topicControllers.createTopic);


router.patch('/:topicId',
    [
        check('topic')
            .isLength({ min: 3 }),
        check('lessonDate')
            .not()
            .isEmpty(),
        check('teacherId')
            .not()
            .isEmpty()
    ],
    topicControllers.updateTopic);

router.delete('/:topicId', topicControllers.deleteTopic);

module.exports = router;