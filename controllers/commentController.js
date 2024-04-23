const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');

const Comment = require('../models/commentModel');
const Blog = require('../models/blogModel');
const Notification = require('../models/notificationModel');

exports.createComment = catchAsync(async (req, res, next) => {
  const { user } = req;

  const { blogId, blogAuthor, content, replyingTo } = req.body;

  if (!content.length)
    return next(new AppError('Write something to leave a comment', 403));

  const commentObj = { blogId, blogAuthor, content, commentedBy: user };

  if (replyingTo) {
    commentObj.parent = replyingTo;
    commentObj.isReply = true;
  }

  const comment = await Comment.create(commentObj);

  await Blog.findByIdAndUpdate(
    { _id: blogId },
    {
      $push: { comments: comment._id },
      $inc: {
        'activity.totalComments': 1,
        'activity.totalParentComments': replyingTo ? 0 : 1,
      },
    },
  );

  const notificationObj = {
    type: replyingTo ? 'reply' : 'comment',
    blog: blogId,
    notificationFor: blogAuthor,
    user,
    comment: comment._id,
  };

  if (replyingTo) {
    notificationObj.repliedOnComment = replyingTo;

    const replyingToCommentDoc = await Comment.findOneAndUpdate(
      { _id: replyingTo },
      { $push: { children: comment._id } },
    );

    notificationObj.notificationFor = replyingToCommentDoc.commentedBy._id;
  }

  await Notification.create(notificationObj);

  res.status(201).json({
    status: 'success',
    comment,
  });
});
