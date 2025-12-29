import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './LoginPage.css';

function LoginPage() {
    const navigate = useNavigate();
    const { login } = useAuth();

    const [formData, setFormData] = useState({
        userType: 'STUDENT',
        identifier: '',
        password: ''
    });
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleChange = (e) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value
        });
        setError('');
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        const result = await login(formData);

        if (result.success) {
            const userType = result.user.userType;
            if (userType === 'STUDENT') {
                navigate('/student/dashboard');
            } else if (userType === 'TEACHER') {
                navigate('/teacher/dashboard');
            } else if (userType === 'ADMIN') {
                navigate('/admin/dashboard');
            }
        } else {
            setError(result.message);
        }

        setLoading(false);
    };

    const getPlaceholder = () => {
        switch (formData.userType) {
            case 'STUDENT':
                return 'Enter Roll Number';
            case 'TEACHER':
                return 'Enter Teacher ID';
            case 'ADMIN':
                return 'Enter Admin ID';
            default:
                return 'Enter ID';
        }
    };

    return (
        <div className="login-page">
            <div className="login-container">
                <div className="login-header">
                    <h1>Little Leaf Play School</h1>
                    <p>Welcome back! Please login to continue</p>
                </div>

                <form onSubmit={handleSubmit} className="login-form">
                    <div className="form-group">
                        <label htmlFor="userType">Login As</label>
                        <select
                            id="userType"
                            name="userType"
                            value={formData.userType}
                            onChange={handleChange}
                            required
                        >
                            <option value="STUDENT">Student</option>
                            <option value="TEACHER">Teacher</option>
                            <option value="ADMIN">Admin</option>
                        </select>
                    </div>

                    <div className="form-group">
                        <label htmlFor="identifier">
                            {formData.userType === 'STUDENT' ? 'Roll Number' :
                             formData.userType === 'TEACHER' ? 'Teacher ID' : 'Admin ID'}
                        </label>
                        <input
                            type="text"
                            id="identifier"
                            name="identifier"
                            value={formData.identifier}
                            onChange={handleChange}
                            placeholder={getPlaceholder()}
                            required
                        />
                    </div>

                    <div className="form-group">
                        <label htmlFor="password">Password</label>
                        <input
                            type="password"
                            id="password"
                            name="password"
                            value={formData.password}
                            onChange={handleChange}
                            placeholder="Enter Password"
                            required
                        />
                    </div>

                    {error && <div className="error-message">{error}</div>}

                    <button type="submit" className="btn btn-primary btn-full" disabled={loading}>
                        {loading ? 'Logging in...' : 'Login'}
                    </button>
                </form>

                <div className="login-footer">
                    <button onClick={() => navigate('/')} className="btn-link">
                        Back to Home
                    </button>
                </div>
            </div>
        </div>
    );
}

export default LoginPage;
