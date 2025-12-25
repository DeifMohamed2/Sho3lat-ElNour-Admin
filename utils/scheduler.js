// utils/scheduler.js
// Utility to manage scheduled jobs using node-cron

const cron = require('node-cron');

class Scheduler {
  constructor() {
    this.jobs = new Map();
  }

  /**
   * Schedule a new job
   * @param {string} name - Unique name for the job
   * @param {string} cronExpression - Cron expression (e.g., '0 3 * * *')
   * @param {Function} task - Function to execute
   * @param {Object} options - Additional options
   */
  scheduleJob(name, cronExpression, task, options = {}) {
    try {
      // Validate cron expression
      if (!cron.validate(cronExpression)) {
        throw new Error(`Invalid cron expression: ${cronExpression}`);
      }

      // Stop existing job if it exists
      if (this.jobs.has(name)) {
        this.stopJob(name);
      }

      // Create and start the job
      const job = cron.schedule(cronExpression, task, {
        scheduled: true,
        timezone: 'Africa/Cairo', // Egypt timezone
        ...options
      });

      this.jobs.set(name, {
        job,
        cronExpression,
        task,
        createdAt: new Date()
      });

      console.log(`✅ Scheduled job '${name}' with cron: ${cronExpression}`);
      
      return job;
    } catch (error) {
      console.error(`❌ Error scheduling job '${name}':`, error.message);
      throw error;
    }
  }

  /**
   * Stop a scheduled job
   * @param {string} name - Job name
   */
  stopJob(name) {
    const jobData = this.jobs.get(name);
    if (jobData) {
      jobData.job.stop();
      this.jobs.delete(name);
      console.log(`🛑 Stopped job '${name}'`);
      return true;
    }
    return false;
  }

  /**
   * Reschedule an existing job
   * @param {string} name - Job name
   * @param {string} newCronExpression - New cron expression
   */
  rescheduleJob(name, newCronExpression) {
    const jobData = this.jobs.get(name);
    if (jobData) {
      this.scheduleJob(name, newCronExpression, jobData.task);
      console.log(`🔄 Rescheduled job '${name}' to: ${newCronExpression}`);
      return true;
    }
    console.warn(`⚠️  Job '${name}' not found for rescheduling`);
    return false;
  }

  /**
   * Get all scheduled jobs
   */
  getAllJobs() {
    const jobs = [];
    for (const [name, data] of this.jobs.entries()) {
      jobs.push({
        name,
        cronExpression: data.cronExpression,
        createdAt: data.createdAt
      });
    }
    return jobs;
  }

  /**
   * Check if a job exists
   * @param {string} name - Job name
   */
  hasJob(name) {
    return this.jobs.has(name);
  }

  /**
   * Stop all jobs
   */
  stopAll() {
    for (const [name, jobData] of this.jobs.entries()) {
      jobData.job.stop();
      console.log(`🛑 Stopped job '${name}'`);
    }
    this.jobs.clear();
  }
}

// Export singleton instance
module.exports = new Scheduler();
