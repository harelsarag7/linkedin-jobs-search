const validateSearchParams = (params) => {
    const errors = [];

    if (params.salary && !['40000', '60000', '80000', '100000', '120000'].includes(params.salary)) {
        errors.push('Invalid salary range');
    }

    if (params.experienceLevel && !['internship', 'entry level', 'associate', 'senior', 'director', 'executive'].includes(params.experienceLevel)) {
        errors.push('Invalid experience level');
    }

    if (params.jobType && !['full time', 'part time', 'contract', 'temporary', 'volunteer', 'internship'].includes(params.jobType)) {
        errors.push('Invalid job type');
    }

    return errors;
};

module.exports = { validateSearchParams };