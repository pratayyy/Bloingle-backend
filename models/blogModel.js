const mongoose = require('mongoose');
const slugify = require('slugify');

const User = require('./userModel');

const blogSchema = mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'A blog must have title'],
      maxlength: [40, 'A blog name must have less or equal then 40 characters'],
      minlength: [8, 'A blog name must have more or equal then 10 characters'],
    },
    slug: String,
    banner: {
      type: String,
      required: [true, 'A blog must have a banner'],
    },
    description: {
      type: String,
      required: [true, 'A blog must have a description'],
      maxlength: [
        200,
        'A blog must have description less then or equal to 200 characters',
      ],
    },
    content: {
      type: [],
      required: true,
      validate: {
        validator: function (value) {
          return (
            value &&
            typeof value === 'object' &&
            value.blocks &&
            Array.isArray(value.blocks) &&
            value.blocks.length > 0
          );
        },
        message: 'A blog must have content',
      },
    },
    tags: {
      type: [String],
      required: [true, 'A blog must have some tags'],
      maxlength: [10, 'A blog can have a maximum of 10 tags'],
    },
    author: {
      type: mongoose.Schema.ObjectId,
      required: [true, 'A blog must have a author'],
      ref: 'User',
    },
    activity: {
      totalLikes: {
        type: Number,
        default: 0,
      },
      totalComments: {
        type: Number,
        default: 0,
      },
      totalReads: {
        type: Number,
        default: 0,
      },
      totalParentComments: {
        type: Number,
        default: 0,
      },
    },
    comments: {
      type: [mongoose.Schema.ObjectId],
      ref: 'Comment',
    },
    draft: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: {
      createdAt: 'publishedAt',
    },
  },
);

blogSchema.pre('save', function (next) {
  this.tags = this.tags.map((tag) => tag.toLowerCase());
  this.slug = slugify(this.title, { lower: true });
  next();
});

blogSchema.statics.calcTotalPosts = async function (userId) {
  const stats = await this.aggregate([
    {
      $match: { author: userId },
    },
    {
      $group: {
        _id: '$author',
        numberOfPosts: { $sum: 1 },
      },
    },
  ]);

  if (stats.length > 0) {
    await User.findByIdAndUpdate(userId, {
      'accountInfo.totalPosts': stats[0].numberOfPosts,
    });
  } else {
    await User.findByIdAndUpdate(userId, {
      'accountInfo.totalPosts': 0,
    });
  }
};

blogSchema.post('save', function () {
  if (!this.draft) this.constructor.calcTotalPosts(this.author);
});

blogSchema.pre(/^findOneAnd/, async function (next) {
  this.b = await this.findOne();
  next();
});

blogSchema.pre(/^findOneAnd/, async function () {
  await this.b.constructor.calcTotalPosts(this.b.author);
});

const Blog = mongoose.model('Blog', blogSchema);

module.exports = Blog;
