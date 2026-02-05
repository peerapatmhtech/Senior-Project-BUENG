import './Home.css';
import EventList from './event/Eventlist';
import RequireLogin from '../components/RequireLogin';
import { useTheme } from '../context/themecontext';
import RoomMatch from '../community/roommatch';
import { useState, useEffect } from 'react';
import AccordionList from './cardmatch/AccordionList';
import HeaderProfile from '../components/HeaderProfile';
import Joyride, { STATUS } from 'react-joyride';
import {
  Shirt,
  Diamond,
  Palette,
  Trophy,
  Sparkles,
  Book,
  Coffee,
  Cake,
  Utensils,
  Monitor,
  Drum,
  GlassWater,
  Zap,
  Users,
  Gamepad2,
  Sprout,
  Music,
  Dumbbell,
  Wine,
  Pizza,
  Store,
  CodeXml,
  Camera,
  ShoppingCart,
  Waves,
  Plane,
  Cpu,
  HeartHandshake,
  Wrench,
  Accessibility,
} from 'lucide-react';

const Newcommu = () => {
  const { isDarkMode } = useTheme();
  const [selectedRooms, setSelectedRooms] = useState([]);
  const [waiting, setWaiting] = useState(false);
  const [runTour, setRunTour] = useState(false);

  const [tourSteps] = useState([
    {
      target: 'body',
      content: 'ยินดีต้อนรับสู่ Find Friend เราจะพาคุณไปชมส่วนต่างๆ ที่น่าสนใจ',
      placement: 'center',
    },
    {
      target: '.header-home',
      content:
        'ตรงนี้คือส่วนโปรไฟล์ของคุณ คุณสามารถจัดการโปรไฟล์, ดูการแจ้งเตือน, และตั้งค่าต่างๆ ได้ที่นี่',
    },
    {
      target: '.accordion-list',
      content: 'คุณสามารถค้นหากิจกรรมหรือห้องที่น่าสนใจได้จากหมวดหมู่ต่างๆ ที่นี่',
    },
    {
      target: '.event-container',
      content: 'ในแต่ละกิจกรรมคุณสามารถกดปุ่มหัวใจได้ทันที แนะนำให้กดเยอะจะได้คู่แมทช์เยอะๆ',
    },
    {
      target: '.card-stack',
      content: 'และนี่คือคือคนผู้ใช้งานอื่นที่ชื่นชอบกิจกรรมเดียวกับคุณ',
    },
    {
      target: '.button-group',
      content: 'จากนั้น ปัดซ้ายย!! ปัดขวา!! ที่การ์ดหรือกดปุ่มตรงนี้ได้เล้ยย',
    },
  ]);

  useEffect(() => {
    const hasSeenTour = localStorage.getItem('hasSeenTour');
    if (!hasSeenTour) {
      setRunTour(true);
    }
  }, []);

  const handleJoyrideCallback = (data) => {
    const { status } = data;
    if ([STATUS.FINISHED, STATUS.SKIPPED].includes(status)) {
      setRunTour(false);
      localStorage.setItem('hasSeenTour', 'true');
    }
  };

  const handleStartTour = () => {
    localStorage.removeItem('hasSeenTour'); // ลบสถานะที่เคยดูแล้ว เพื่อให้ทัวร์เริ่มใหม่
    setRunTour(true); // เริ่มทัวร์
  };

  return (
    <RequireLogin>
      <div className={`main-con-home ${isDarkMode ? 'dark-mode' : ''}`}>
        <Joyride
          steps={tourSteps}
          run={runTour}
          callback={handleJoyrideCallback}
          continuous
          showProgress
          showSkipButton
          styles={{
            options: {
              zIndex: 10000,
            },
          }}
        />
        <header className="header-home">
          <HeaderProfile
            className="profile-section-home"
            onStartTour={handleStartTour} // ส่งฟังก์ชันสำหรับเริ่มทัวร์ไปให้ HeaderProfile
          />
        </header>
        <div className="event-list-co">
          <div className="bg-event-con">
            <div className="show-commu">
              <AccordionList
                items={[
                  {
                    title: 'เลือกความสนใจของคุณ',
                    genres: [
                      {
                        title: 'All Categories',
                        tabs: [
                          { label: 'Apparel', icon: <Shirt size={18} /> },
                          { label: 'Accessories', icon: <Diamond size={18} /> },
                          { label: 'Art', icon: <Palette size={18} /> },
                          { label: 'Badminton', icon: <Trophy size={18} /> },
                          { label: 'Beauty', icon: <Sparkles size={18} /> },
                          { label: 'Books', icon: <Book size={18} /> },
                          { label: 'Cafe', icon: <Coffee size={18} /> },
                          { label: 'Cake', icon: <Cake size={18} /> },
                          { label: 'Coffee', icon: <Coffee size={18} /> },
                          { label: 'Cooking', icon: <Utensils size={18} /> },
                          { label: 'Computers', icon: <Monitor size={18} /> },
                          { label: 'Drum', icon: <Drum size={18} /> },
                          { label: 'Dinner', icon: <GlassWater size={18} /> },
                          { label: 'Electronic', icon: <Zap size={18} /> },
                          { label: 'Family', icon: <Users size={18} /> },
                          { label: 'Football', icon: <Trophy size={18} /> },
                          { label: 'Game', icon: <Gamepad2 size={18} /> },
                          { label: 'Growth', icon: <Sprout size={18} /> },
                          { label: 'Guitar', icon: <Music size={18} /> },
                          { label: 'Gym', icon: <Dumbbell size={18} /> },
                          { label: 'Hangout', icon: <Wine size={18} /> },
                          { label: 'Junk Food', icon: <Pizza size={18} /> },
                          { label: 'Market', icon: <Store size={18} /> },
                          { label: 'Music', icon: <Music size={18} /> },
                          { label: 'Programming', icon: <CodeXml size={18} /> },
                          { label: 'Photo', icon: <Camera size={18} /> },
                          { label: 'Shopping', icon: <ShoppingCart size={18} /> },
                          { label: 'Swimming', icon: <Waves size={18} /> },
                          { label: 'Travel', icon: <Plane size={18} /> },
                          { label: 'Technology', icon: <Cpu size={18} /> },
                          { label: 'Volunteer', icon: <HeartHandshake size={18} /> },
                          { label: 'Workshop', icon: <Wrench size={18} /> },
                          { label: 'Yoga', icon: <Accessibility size={18} /> },
                        ],
                      },
                    ],
                  },
                ]}
                setWaiting={setWaiting}
              />

              <EventList waiting={waiting} />
            </div>

            <RoomMatch
              isDeleteMode={isDarkMode}
              selectedRooms={selectedRooms}
              setSelectedRooms={setSelectedRooms}
            />
          </div>
        </div>
      </div>
    </RequireLogin>
  );
};

export default Newcommu;
