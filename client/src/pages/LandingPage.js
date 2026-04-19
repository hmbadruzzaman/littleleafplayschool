import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { publicAPI } from '../services/api';
import InquiryForm from '../components/forms/InquiryForm';
import LeafMark from '../components/common/LeafMark';
import Placeholder from '../components/common/Placeholder';
import './LandingPage.css';

function LandingPage() {
    const [schoolInfo, setSchoolInfo] = useState(null);
    const [gallery, setGallery] = useState([]);
    const [holidays, setHolidays] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showInquiryForm, setShowInquiryForm] = useState(false);
    const [mobileNavOpen, setMobileNavOpen] = useState(false);
    const [showGallery, setShowGallery] = useState(false);

    useEffect(() => { fetchData(); }, []);

    const fetchData = async () => {
        try {
            const [infoRes, galleryRes, holidaysRes] = await Promise.all([
                publicAPI.getSchoolInfo(),
                publicAPI.getGallery(),
                publicAPI.getHolidays()
            ]);
            setSchoolInfo(infoRes.data.data);
            setGallery(galleryRes.data.data);
            setHolidays(holidaysRes.data.data || []);
        } catch (error) {
            console.error('Error fetching data:', error);
        } finally {
            setLoading(false);
        }
    };

    const upcomingHolidays = holidays
        .filter(h => {
            const today = new Date(); today.setHours(0,0,0,0);
            const [y,m,d] = h.holidayDate.split('-');
            return new Date(y, m-1, d) >= today;
        })
        .sort((a,b) => {
            const [y1,m1,d1] = a.holidayDate.split('-');
            const [y2,m2,d2] = b.holidayDate.split('-');
            return new Date(y1,m1-1,d1) - new Date(y2,m2-1,d2);
        });

    const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

    if (loading) return <div className="loading">Loading…</div>;

    const name = schoolInfo?.schoolName || 'Little Leaf Play School';

    return (
        <div className="ll-landing">

            {/* ── Nav ───────────────────────────────── */}
            <header className="ll-nav">
                <div className="container ll-nav__inner">
                    <a href="/" className="ll-nav__logo">
                        <div className="ll-nav__logo-icon">
                            <LeafMark size={20} />
                        </div>
                        <span>{name}</span>
                    </a>

                    <nav className={`ll-nav__links ${mobileNavOpen ? 'll-nav__links--open' : ''}`}>
                        <a href="#programs">Programs</a>
                        <a href="#about">About</a>
                        <a href="#gallery">Gallery</a>
                        <a href="#contact">Contact</a>
                        <Link to="/login" className="btn btn-ghost btn-sm">Portal login</Link>
                        <button className="btn btn-primary btn-sm" onClick={() => { setShowInquiryForm(true); setMobileNavOpen(false); }}>
                            Book a visit
                        </button>
                    </nav>

                    <button className="ll-nav__hamburger" onClick={() => setMobileNavOpen(o => !o)} aria-label="Toggle menu">
                        <span /><span /><span />
                    </button>
                </div>
            </header>

            {/* ── Hero ──────────────────────────────── */}
            <section className="ll-hero">
                <div className="ll-hero__blob ll-hero__blob--1" />
                <div className="ll-hero__blob ll-hero__blob--2" />
                <div className="container ll-hero__inner">
                    <div className="ll-hero__copy">
                        <div className="ll-eyebrow">Admissions open — 2026 batch</div>
                        <h1 className="ll-hero__h1">
                            Where little ones<br />
                            <em>grow at their own</em><br />
                            wonderful pace.
                        </h1>
                        <p className="ll-hero__sub">
                            A play-based early learning home for curious minds ages 2 to 6.
                            Small classes, big imaginations, and teachers who remember every name.
                        </p>
                        <div className="ll-hero__actions">
                            <button className="btn btn-primary btn-lg" onClick={() => setShowInquiryForm(true)}>
                                Request a call back →
                            </button>
                            <a
                                href={schoolInfo?.brochureUrl || 'https://little-leaf.s3.us-east-1.amazonaws.com/little-leaf/brochure.pdf'}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="btn btn-ghost btn-lg"
                            >
                                Download brochure
                            </a>
                        </div>
                    </div>
                    <div className="ll-hero__collage">
                        {(() => {
                            const photos = gallery.filter(g => g.mediaType === 'PHOTO');
                            // Curated picks (gallery numbers are 1-indexed as seen in the admin gallery)
                            const playPhoto       = photos[22]; // #23
                            const artPhoto        = photos[23]; // #24
                            const storyPhoto      = photos[19]; // #20
                            const musicPhoto      = photos[3];  // #4
                            return (
                                <>
                                    <div className="ll-hero__col ll-hero__col--offset">
                                        <HeroTile ratio="3/4" tone="moss" photo={playPhoto}>play</HeroTile>
                                        <HeroTile ratio="4/3" tone="warm" photo={artPhoto}>art corner</HeroTile>
                                    </div>
                                    <div className="ll-hero__col">
                                        <HeroTile ratio="4/3" tone="cream" photo={storyPhoto}>story circle</HeroTile>
                                        <HeroTile ratio="3/4" tone="moss" photo={musicPhoto}>music time</HeroTile>
                                    </div>
                                </>
                            );
                        })()}
                    </div>
                </div>
            </section>

            {/* ── Marquee ───────────────────────────── */}
            <div className="ll-marquee">
                <div className="ll-marquee__track">
                    {[0,1,2].map(i => (
                        <React.Fragment key={i}>
                            <span>Play-based learning</span>
                            <LeafMark size={20} className="ll-marquee__leaf" />
                            <span>Tiny classes, giant hearts</span>
                            <LeafMark size={20} className="ll-marquee__leaf" />
                            <span>Stories &amp; songs &amp; giggles</span>
                            <LeafMark size={20} className="ll-marquee__leaf" />
                            <span>Est. 2023</span>
                            <LeafMark size={20} className="ll-marquee__leaf" />
                        </React.Fragment>
                    ))}
                </div>
            </div>

            {/* ── Programs ──────────────────────────── */}
            <section className="ll-section" id="programs">
                <div className="container">
                    <div className="ll-section__head">
                        <div>
                            <div className="ll-eyebrow">01 — Programs</div>
                            <h2 className="ll-section__title">Four gentle circles<br /><em>of learning.</em></h2>
                        </div>
                    </div>
                    <div className="ll-programs">
                        {[
                            { age:'2–3 yrs', name:'Playgroup', tone:'moss', blurb:'First steps away from home. Sensory bins, messy art, lots of hugs.' },
                            { age:'3–4 yrs', name:'Nursery',   tone:'butter', blurb:'Story circles, counting games, and making friends who stick.' },
                            { age:'4–5 yrs', name:'LKG',       tone:'warm', blurb:'Phonics through song. Writing with fingers, feet, and chalk.' },
                            { age:'5–6 yrs', name:'UKG',       tone:'cream', blurb:'Building confidence, independence, and the joy of finishing.' },
                        ].map((p, i) => (
                            <div key={i} className="ll-program-card">
                                <Placeholder ratio="4/3" tone={p.tone} rounded="var(--radius) var(--radius) 0 0">{p.name}</Placeholder>
                                <div className="ll-program-card__body">
                                    <div className="ll-program-card__age">{p.age}</div>
                                    <h3 className="ll-program-card__name">{p.name}</h3>
                                    <p>{p.blurb}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ── A day at Little Leaf ──────────────── */}
            <section className="ll-section ll-section--tinted" id="schedule">
                <div className="container">
                    <div className="ll-section__head">
                        <div>
                            <div className="ll-eyebrow">02 — A day at Little Leaf</div>
                            <h2 className="ll-section__title">From <em>sleepy arrivals</em><br />to proud goodbyes.</h2>
                        </div>
                    </div>
                    <ol className="ll-daytimeline">
                        {[
                            { time: '10:00 AM', title: 'Arrival',          desc: 'Warm hellos at the gate and a gentle transition from home to school.' },
                            { time: '10:15 AM', title: 'Morning assembly', desc: 'Good-morning songs, prayer, and a peek at today\u2019s weather.' },
                            { time: '10:30 AM', title: 'Circle and Story', desc: 'Gathered on the mat for stories, rhymes, and wide-eyed wonder.' },
                            { time: '11:00 AM', title: 'Classes',          desc: 'Phonics, numbers, and themed learning in small, focused groups.' },
                            { time: '12:00 PM', title: 'Exploration time', desc: 'Art, sensory play, and free-choice corners that follow their curiosity.' },
                            { time: '12:30 PM', title: 'Snack',            desc: 'A quiet break to refuel \u2014 healthy bites and chatter with friends.' },
                            { time: '1:00 PM',  title: 'Fun and games',    desc: 'Outdoor play and group games, then happy goodbyes at home time.' },
                        ].map((s, i) => (
                            <li key={i} className="ll-daytimeline__row">
                                <div className="ll-daytimeline__time">{s.time}</div>
                                <div className="ll-daytimeline__body">
                                    <h3 className="ll-daytimeline__title">{s.title}</h3>
                                    <p className="ll-daytimeline__desc">{s.desc}</p>
                                </div>
                            </li>
                        ))}
                    </ol>
                </div>
            </section>

            {/* ── About / key personnel ─────────────── */}
            <section className="ll-section" id="about">
                <div className="container">
                    <div className="ll-section__head">
                        <div>
                            <div className="ll-eyebrow">03 — People</div>
                            <h2 className="ll-section__title">The grown-ups<br /><em>who make it home.</em></h2>
                        </div>
                    </div>

                    <div className="ll-about-text">
                        <p>
                            {name} is dedicated to quality early childhood education in a safe, nurturing
                            environment. We focus on holistic development through play-based learning.
                        </p>
                        {schoolInfo?.foundedYear && <p><strong>Founded:</strong> {schoolInfo.foundedYear}</p>}
                    </div>

                    <div className="ll-people">
                        <div className="ll-person-card">
                            <div className="ll-person-card__img">
                                <img
                                    src="https://little-leaf.s3.us-east-1.amazonaws.com/little-leaf/tajmul-Haque.jpg"
                                    alt="Director"
                                    onError={e => { e.target.style.display='none'; e.target.nextSibling.style.display='flex'; }}
                                />
                                <div className="ll-person-card__img-fallback" style={{ display:'none' }}>
                                    <LeafMark size={36} />
                                </div>
                            </div>
                            <div className="ll-person-card__body">
                                <div className="ll-eyebrow">Director</div>
                                <h3>Mr. Tajmul Haque</h3>
                                <p>Over 30 years of experience as Retired Chief Office Superintendent in Indian Railways.</p>
                            </div>
                        </div>

                        <div className="ll-person-card">
                            <div className="ll-person-card__img">
                                <img
                                    src="https://little-leaf.s3.us-east-1.amazonaws.com/little-leaf/Riju.jpg"
                                    alt="Principal"
                                    onError={e => { e.target.style.display='none'; e.target.nextSibling.style.display='flex'; }}
                                />
                                <div className="ll-person-card__img-fallback" style={{ display:'none' }}>
                                    <LeafMark size={36} />
                                </div>
                            </div>
                            <div className="ll-person-card__body">
                                <div className="ll-eyebrow">Principal</div>
                                <h3>{schoolInfo?.principalName || 'Ms. Riju Haque'}</h3>
                                <p>Dedicated educator committed to fostering excellence in early childhood education.</p>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* ── Holidays ──────────────────────────── */}
            {upcomingHolidays.length > 0 && (
                <section className="ll-section ll-section--tinted">
                    <div className="container">
                        <div className="ll-section__head">
                            <div>
                                <div className="ll-eyebrow">04 — Calendar</div>
                                <h2 className="ll-section__title">Upcoming <em>holidays</em></h2>
                            </div>
                        </div>
                        <div className="ll-holidays">
                            {upcomingHolidays.map((h, i) => {
                                const [,mon,day] = h.holidayDate.split('-');
                                return (
                                    <div key={i} className="ll-holiday-card">
                                        <div className="ll-holiday-card__date">
                                            <span className="ll-holiday-card__day">{parseInt(day)}</span>
                                            <span className="ll-holiday-card__mon">{MONTHS[parseInt(mon)-1]}</span>
                                        </div>
                                        <div className="ll-holiday-card__info">
                                            <h4>{h.holidayName}</h4>
                                            <span className="ll-badge">{h.holidayType.replace(/_/g,' ')}</span>
                                            {h.description && <p>{h.description}</p>}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </section>
            )}

            {/* ── Gallery ───────────────────────────── */}
            {gallery.length > 0 && (
                <section className="ll-section" id="gallery">
                    <div className="container">
                        <div className="ll-section__head">
                            <div>
                                <div className="ll-eyebrow">05 — Gallery</div>
                                <h2 className="ll-section__title"><em>Days</em>, remembered.</h2>
                            </div>
                            {showGallery && (
                                <button className="btn btn-ghost btn-sm" onClick={() => setShowGallery(false)}>
                                    Hide gallery
                                </button>
                            )}
                        </div>
                        {showGallery ? (
                            <div className="ll-gallery">
                                {gallery.map((item, i) => (
                                    <div key={i} className={`ll-gallery__item ${i === 0 ? 'll-gallery__item--wide' : ''}`}>
                                        {item.mediaType === 'PHOTO' ? (
                                            <img src={item.thumbnailUrl || item.s3Url} alt={item.title} loading="lazy" />
                                        ) : (
                                            <div className="ll-gallery__video">
                                                <div className="ll-gallery__play">▶</div>
                                                <span>{item.title}</span>
                                            </div>
                                        )}
                                        {item.title && <p className="ll-gallery__caption">{item.title}</p>}
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="ll-gallery-tease">
                                <p className="ll-gallery-tease__copy">
                                    {gallery.length} photos &amp; moments from around school —
                                    art corners, story circles, birthday smiles, and muddy shoes.
                                </p>
                                <button className="btn btn-primary btn-lg" onClick={() => setShowGallery(true)}>
                                    Show the gallery →
                                </button>
                            </div>
                        )}
                    </div>
                </section>
            )}

            {/* ── Contact ───────────────────────────── */}
            <section className="ll-contact" id="contact">
                <div className="ll-contact__blob" />
                <div className="container ll-contact__inner">
                    <div className="ll-contact__copy">
                        <div className="ll-eyebrow ll-eyebrow--light">06 — Come say hello</div>
                        <h2 className="ll-contact__h2">
                            Pop by for a<br /><em>cup of tea</em><br />and a tour.
                        </h2>
                        <p>Bring your little one. We'll show them the reading nook, the sandpit, and the teachers.</p>
                        <button className="btn btn-lg ll-contact__cta" onClick={() => setShowInquiryForm(true)}>
                            Book a visit →
                        </button>
                    </div>
                    <div className="ll-contact__details">
                        {[
                            ['Address', schoolInfo?.address || 'Shibpur, Howrah 711102, West Bengal'],
                            ['Phone', schoolInfo?.phone || '+91 98300 12345'],
                            ['Email', schoolInfo?.email || 'hello@welittleleaf.com'],
                        ].map(([k,v]) => (
                            <div key={k} className="ll-contact__row">
                                <span className="ll-contact__label">{k}</span>
                                <span>{v}</span>
                            </div>
                        ))}
                        {schoolInfo?.website && (
                            <div className="ll-contact__row">
                                <span className="ll-contact__label">Website</span>
                                <a href={schoolInfo.website.startsWith('http') ? schoolInfo.website : `https://${schoolInfo.website}`}
                                    target="_blank" rel="noopener noreferrer">{schoolInfo.website}</a>
                            </div>
                        )}
                    </div>
                </div>
            </section>

            {/* ── Footer ────────────────────────────── */}
            <footer className="ll-footer">
                <div className="container ll-footer__inner">
                    <div className="ll-nav__logo">
                        <div className="ll-nav__logo-icon"><LeafMark size={16} /></div>
                        <span>{name}</span>
                    </div>
                    <p>© {new Date().getFullYear()} {name}. All rights reserved.</p>
                    <Link to="/login" className="ll-footer__portal">Staff &amp; student portal →</Link>
                </div>
            </footer>

            {showInquiryForm && <InquiryForm onClose={() => setShowInquiryForm(false)} />}
        </div>
    );
}

function HeroTile({ ratio, tone, photo, children }) {
    if (!photo) {
        return <Placeholder ratio={ratio} tone={tone}>{children}</Placeholder>;
    }
    return (
        <div style={{
            aspectRatio: ratio,
            borderRadius: 'var(--radius)',
            position: 'relative',
            overflow: 'hidden',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
        }}>
            <img
                src={photo.thumbnailUrl || photo.s3Url}
                alt={typeof children === 'string' ? children : (photo.title || 'Little Leaf')}
                style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
            />
            {children && (
                <span style={{
                    position: 'relative',
                    zIndex: 1,
                    background: 'rgba(250, 246, 238, 0.82)',
                    padding: '6px 14px',
                    borderRadius: 999,
                    fontFamily: 'var(--font-display)',
                    fontStyle: 'italic',
                    fontSize: 18,
                    color: 'var(--forest-900)',
                    letterSpacing: '0.02em',
                    backdropFilter: 'blur(2px)',
                }}>
                    {children}
                </span>
            )}
        </div>
    );
}

export default LandingPage;
