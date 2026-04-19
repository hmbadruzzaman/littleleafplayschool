import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import LeafMark from '../components/common/LeafMark';
import './LoginPage.css';

function LoginPage() {
    const navigate = useNavigate();
    const { login } = useAuth();

    const [formData, setFormData] = useState({ userType: 'ADMIN', identifier: '', password: '' });
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleChange = e => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
        setError('');
    };

    const handleSubmit = async e => {
        e.preventDefault();
        setError('');
        setLoading(true);
        const result = await login(formData);
        if (result.success) {
            const t = result.user.userType;
            if (t === 'STUDENT') navigate('/student/dashboard');
            else if (t === 'TEACHER') navigate('/teacher/dashboard');
            else if (t === 'ADMIN') navigate('/admin/dashboard');
        } else {
            setError(result.message);
        }
        setLoading(false);
    };

    const idLabels = {
        STUDENT: { label: 'Roll Number', placeholder: 'e.g. 2026-007' },
        TEACHER: { label: 'Teacher ID',  placeholder: 'e.g. TCH-014'  },
        ADMIN:   { label: 'Admin ID',    placeholder: 'e.g. ADM001'   },
    };

    return (
        <div className="ll-login">
            {/* ── Left panel ───────────────────── */}
            <div className="ll-login__panel">
                <div className="ll-login__panel-blob ll-login__panel-blob--1" />
                <div className="ll-login__panel-blob ll-login__panel-blob--2" />

                <button onClick={() => navigate('/')} className="ll-login__back">
                    ← Back to website
                </button>

                <div className="ll-login__panel-center">
                    <div className="ll-login__logo">
                        <div className="ll-login__logo-icon"><LeafMark size={28} /></div>
                        <span>Little Leaf</span>
                    </div>
                    <h1 className="ll-login__welcome">
                        Welcome<br /><em>back.</em>
                    </h1>
                    <p className="ll-login__tagline">
                        Sign in to see fees, exam results, attendance, and everything happening at Little Leaf.
                    </p>
                </div>

                <div className="ll-login__stats">
                    {[['4', 'Classes']].map(([n, l]) => (
                        <div key={l} className="ll-login__stat">
                            <div className="ll-login__stat-n">{n}</div>
                            <div className="ll-login__stat-l">{l}</div>
                        </div>
                    ))}
                </div>
            </div>

            {/* ── Right panel / form ───────────── */}
            <div className="ll-login__form-wrap">
                <div className="ll-login__form-box">
                    <div className="ll-eyebrow" style={{ marginBottom: 10 }}>Portal</div>
                    <h2 className="ll-login__form-title">Sign in</h2>
                    <p className="ll-login__form-sub">Choose your role to continue.</p>

                    {/* Role switcher */}
                    <div className="ll-login__role-switch">
                        {['STUDENT','TEACHER','ADMIN'].map(r => (
                            <button
                                key={r}
                                type="button"
                                className={`ll-login__role-btn ${formData.userType === r ? 'll-login__role-btn--active' : ''}`}
                                onClick={() => { setFormData({ ...formData, userType: r, identifier: '' }); setError(''); }}
                            >
                                {r.charAt(0) + r.slice(1).toLowerCase()}
                            </button>
                        ))}
                    </div>

                    <form onSubmit={handleSubmit} className="ll-login__form">
                        <div className="form-group">
                            <label htmlFor="identifier">{idLabels[formData.userType].label}</label>
                            <input
                                id="identifier"
                                name="identifier"
                                type="text"
                                value={formData.identifier}
                                onChange={handleChange}
                                placeholder={idLabels[formData.userType].placeholder}
                                required
                                autoComplete="username"
                            />
                        </div>

                        <div className="form-group">
                            <div className="ll-login__pw-label">
                                <label htmlFor="password">Password</label>
                                <a href="#forgot" tabIndex={-1}>Forgot?</a>
                            </div>
                            <input
                                id="password"
                                name="password"
                                type="password"
                                value={formData.password}
                                onChange={handleChange}
                                placeholder="Your password"
                                required
                                autoComplete="current-password"
                            />
                        </div>

                        {error && <div className="error-message">{error}</div>}

                        <button type="submit" className="btn btn-primary btn-full btn-lg ll-login__submit" disabled={loading}>
                            {loading ? 'Signing you in…' : 'Enter portal →'}
                        </button>
                    </form>

                    <div className="ll-login__back-link">
                        <button onClick={() => navigate('/')} className="btn-link">← Back to home</button>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default LoginPage;
