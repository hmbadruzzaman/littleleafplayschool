import axios from 'axios';

// API URL - always use production URL for now
const API_BASE_URL = 'https://welittleleaf.com/api';

const api = axios.create({
    baseURL: API_BASE_URL,
    headers: {
        'Content-Type': 'application/json'
    }
});

// Request interceptor to add auth token
api.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('token');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

// Response interceptor to handle errors
api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401) {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            window.location.href = '/login';
        }
        return Promise.reject(error);
    }
);

// Auth APIs
export const authAPI = {
    login: (credentials) => api.post('/auth/login', credentials),
    getProfile: () => api.get('/auth/profile'),
    changePassword: (passwords) => api.put('/auth/change-password', passwords)
};

// Public APIs
export const publicAPI = {
    getSchoolInfo: () => api.get('/public/school-info'),
    getGallery: (mediaType) => api.get('/public/gallery', { params: { mediaType } }),
    getHolidays: () => api.get('/public/holidays'),
    submitContact: (data) => api.post('/public/contact', data)
};

// Student APIs
export const studentAPI = {
    getDashboard: () => api.get('/student/dashboard'),
    getFees: () => api.get('/student/fees'),
    getExamResults: () => api.get('/student/exam-results'),
    getUpcomingExams: () => api.get('/student/upcoming-exams'),
    getHolidays: () => api.get('/student/holidays')
};

// Teacher APIs
export const teacherAPI = {
    getAllStudents: () => api.get('/teacher/students'),
    getStudentsByClass: (className) => api.get(`/teacher/students/class/${className}`),
    getAssignedClasses: () => api.get('/teacher/assigned-classes'),
    createExam: (examData) => api.post('/teacher/exams', examData),
    getAllExams: () => api.get('/teacher/exams'),
    uploadMarks: (marksData) => api.post('/teacher/marks', marksData),
    bulkUploadMarks: (bulkData) => api.post('/teacher/marks/bulk', bulkData),
    getExamResults: (examId) => api.get(`/teacher/exams/${examId}/results`)
};

// Admin APIs
export const adminAPI = {
    // Students
    createStudent: (studentData) => api.post('/admin/students', studentData),
    getAllStudents: () => api.get('/admin/students'),
    updateStudent: (studentId, updates) => api.put(`/admin/students/${studentId}`, updates),
    deleteStudent: (studentId) => api.delete(`/admin/students/${studentId}`),

    // Teachers
    createTeacher: (teacherData) => api.post('/admin/teachers', teacherData),
    getAllTeachers: () => api.get('/admin/teachers'),
    updateTeacher: (teacherId, updates) => api.put(`/admin/teachers/${teacherId}`, updates),

    // Fees
    createFee: (feeData) => api.post('/admin/fees', feeData),
    recordPayment: (feeId, paymentData) => api.put(`/admin/fees/${feeId}/payment`, paymentData),

    // Exams
    createExam: (examData) => api.post('/admin/exams', examData),

    // Holidays
    addHoliday: (holidayData) => api.post('/admin/holidays', holidayData),
    getAllHolidays: () => api.get('/admin/holidays'),

    // Reports
    getEarningsReport: (startDate, endDate) => api.get('/admin/reports/earnings', {
        params: { startDate, endDate }
    }),
    getStudentCountReport: () => api.get('/admin/reports/students'),

    // School Info
    getSchoolInfo: () => api.get('/admin/school-info'),
    updateSchoolInfo: (updates) => api.put('/admin/school-info', updates),

    // Inquiries
    getAllInquiries: () => api.get('/admin/inquiries'),
    updateInquiryStatus: (inquiryId, status) => api.put(`/admin/inquiries/${inquiryId}/status`, { status })
};

export default api;
