import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { publicAPI } from '../services/api';
import InquiryForm from '../components/forms/InquiryForm';
import './LandingPage.css';

function LandingPage() {
    const [schoolInfo, setSchoolInfo] = useState(null);
    const [gallery, setGallery] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showInquiryForm, setShowInquiryForm] = useState(false);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            const [infoRes, galleryRes] = await Promise.all([
                publicAPI.getSchoolInfo(),
                publicAPI.getGallery()
            ]);

            setSchoolInfo(infoRes.data.data);
            setGallery(galleryRes.data.data); // Show all gallery images
        } catch (error) {
            console.error('Error fetching data:', error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return <div className="loading">Loading...</div>;
    }

    return (
        <div className="landing-page">
            {/* Header */}
            <header className="header">
                <div className="container">
                    <div className="nav">
                        <h1 className="logo">{schoolInfo?.schoolName || 'Little Leaf Play School'}</h1>
                        <Link to="/login" className="btn btn-primary">Login</Link>
                    </div>
                </div>
            </header>

            {/* Hero Section */}
            <section className="hero">
                <div className="container">
                    <div className="hero-content">
                        <h2>Welcome to {schoolInfo?.schoolName || 'Little Leaf Play School'}</h2>
                        <p>Nurturing young minds for a bright future</p>
                        <button onClick={() => setShowInquiryForm(true)} className="btn btn-primary btn-lg">
                            Get a call back from us
                        </button>
                    </div>
                </div>
            </section>

            {/* About Section */}
            <section className="about section">
                <div className="container">
                    <h2 className="section-title">About Us</h2>
                    <div className="about-content">
                        <div className="about-text">
                            <p>
                                {schoolInfo?.schoolName || 'Little Leaf Play School'} is dedicated to providing quality early childhood education
                                in a safe, nurturing environment. We focus on holistic development through play-based learning.
                            </p>
                            {schoolInfo?.foundedYear && (
                                <p><strong>Founded:</strong> {schoolInfo.foundedYear}</p>
                            )}
                        </div>
                    </div>
                </div>
            </section>

            {/* Key Personnel Section */}
            <section className="key-personnel section">
                <div className="container">
                    <h2 className="section-title">Key Personnel</h2>
                    <div className="personnel-grid">
                        <div className="personnel-card">
                            <div className="personnel-image">
                                <img src="https://little-leaf.s3.us-east-1.amazonaws.com/little-leaf/tajmul-Haque.jpg" alt="Director" />
                            </div>
                            <div className="personnel-info">
                                <h3>Director</h3>
                                <p className="personnel-name">Mr. Tajmul Haque</p>
                                <p className="personnel-description">
                                    Over 30 years of experience in administration as Retired Chief Office Superintendent in Indian Railways.
                                </p>
                            </div>
                        </div>

                        <div className="personnel-card">
                            <div className="personnel-image">
                                <img src="https://little-leaf.s3.us-east-1.amazonaws.com/little-leaf/Riju.jpg" alt="Principal" />
                            </div>
                            <div className="personnel-info">
                                <h3>Principal</h3>
                                <p className="personnel-name">{schoolInfo?.principalName || 'Mr. H M Kamruzzaman'}</p>
                                <p className="personnel-description">
                                    Dedicated educator committed to fostering excellence in early childhood education.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Contact Section */}
            <section className="contact section">
                <div className="container">
                    <h2 className="section-title">Contact Us</h2>
                    <div className="contact-grid">
                        <div className="contact-info">
                            <div className="contact-item">
                                <h3>Address</h3>
                                <p>{schoolInfo?.address || '123 Education Lane, City, State, ZIP'}</p>
                            </div>
                            <div className="contact-item">
                                <h3>Phone</h3>
                                <p>{schoolInfo?.phone || '+1234567890'}</p>
                            </div>
                            <div className="contact-item">
                                <h3>Email</h3>
                                <p>{schoolInfo?.email || 'info@littleleafplayschool.com'}</p>
                            </div>
                            {schoolInfo?.website && (
                                <div className="contact-item">
                                    <h3>Website</h3>
                                    <p>{schoolInfo.website}</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </section>

            {/* Gallery Section */}
            {gallery.length > 0 && (
                <section className="gallery section">
                    <div className="container">
                        <h2 className="section-title">Gallery</h2>
                        <div className="gallery-grid">
                            {gallery.map((item, index) => (
                                <div key={index} className="gallery-item">
                                    {item.mediaType === 'PHOTO' ? (
                                        <img src={item.thumbnailUrl || item.s3Url} alt={item.title} />
                                    ) : (
                                        <div className="video-placeholder">
                                            <p>Video: {item.title}</p>
                                        </div>
                                    )}
                                    <p className="gallery-caption">{item.title}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>
            )}

            {/* Footer */}
            <footer className="footer">
                <div className="container">
                    <p>&copy; {new Date().getFullYear()} {schoolInfo?.schoolName || 'Little Leaf Play School'}. All rights reserved.</p>
                </div>
            </footer>

            {/* Inquiry Form Modal */}
            {showInquiryForm && (
                <InquiryForm onClose={() => setShowInquiryForm(false)} />
            )}
        </div>
    );
}

export default LandingPage;
