const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const classSchema = new Schema(
  {
    className: {
      type: String,
      required: true,
      trim: true,
    },
    academicLevel: {
      type: String,
      enum: [
        'Year 1',
        'Year 2',
        'Year 3',
        'Year 4',
        'Year 5',
        'Year 6',
        'Year 7',
        'Year 8',
        'Year 9',
        'Year 10',
        'Year 11',
        'Year 12',
      ],
      required: true,
    },
    section: {
      type: String,
      required: false,
      trim: true,
      default: 'A',
    },
    capacity: {
      type: Number,
      required: false,
      default: 30,
    },
    academicYear: {
      type: String,
      required: true,
      default: () => {
        const now = new Date();
        const year = now.getFullYear();
        const month = now.getMonth();
        // Academic year typically starts in September
        if (month >= 8) {
          return `${year}-${year + 1}`;
        }
        return `${year - 1}-${year}`;
      },
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    notes: {
      type: String,
      required: false,
      default: '',
    },
    scheduleImage: {
      type: String,
      required: false,
      default: '',
    },
  },
  { timestamps: true }
);

// Index for faster queries (not unique - allows multiple classes per level/section/year)
classSchema.index({ academicLevel: 1, section: 1, academicYear: 1 });
classSchema.index({ isActive: 1 });

const Class = mongoose.model('Class', classSchema);

module.exports = Class;
