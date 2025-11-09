import "./Home.css";
import EventList from "./event/Eventlist";
import RequireLogin from "../components/RequireLogin";
import { useTheme } from "../context/themecontext";
import RoomMatch from "../community/roommatch";
import { useState, useEffect } from "react";
import AccordionList from "./cardmatch/AccordionList";
import HeaderProfile from "../components/HeaderProfile";
import Joyride, { STATUS } from "react-joyride";

const Newcommu = () => {
  const { isDarkMode } = useTheme();
  const [selectedRooms, setSelectedRooms] = useState([]);
  const [waiting, setWaiting] = useState(false);
  const [runTour, setRunTour] = useState(false);

  const [tourSteps] = useState([
    {
      target: "body",
      content:
        "ยินดีต้อนรับสู่ Find Friend เราจะพาคุณไปชมส่วนต่างๆ ที่น่าสนใจ",
      placement: "center",
    },
    {
      target: ".header-home",
      content:
        "ตรงนี้คือส่วนโปรไฟล์ของคุณ คุณสามารถจัดการโปรไฟล์, ดูการแจ้งเตือน, และตั้งค่าต่างๆ ได้ที่นี่",
    },
    {
      target: ".accordion-list",
      content:
        "คุณสามารถค้นหากิจกรรมหรือห้องที่น่าสนใจได้จากหมวดหมู่ต่างๆ ที่นี่",
    },
    {
      target: ".event-container",
      content: "ในแต่ละกิจกรรมคุณสามารถกดปุ่มหัวใจได้ทันที แนะนำให้กดเยอะจะได้คู่แมทช์เยอะๆ",
    },
    {
      target: ".card-stack",
      content: "และนี่คือคือคนผู้ใช้งานอื่นที่ชื่นชอบกิจกรรมเดียวกับคุณ",
    },
    {
      target: ".button-group",
      content: "จากนั้น ปัดซ้ายย!! ปัดขวา!! ที่การ์ดหรือกดปุ่มตรงนี้ได้เล้ยย",
    },
  ]);

  useEffect(() => {
    const hasSeenTour = localStorage.getItem("hasSeenTour");
    if (!hasSeenTour) {
      setRunTour(true);
    }
  }, []);

  const handleJoyrideCallback = (data) => {
    const { status } = data;
    if ([STATUS.FINISHED, STATUS.SKIPPED].includes(status)) {
      setRunTour(false);
      localStorage.setItem("hasSeenTour", "true");
    }
  };

  const handleStartTour = () => {
    localStorage.removeItem("hasSeenTour"); // ลบสถานะที่เคยดูแล้ว เพื่อให้ทัวร์เริ่มใหม่
    setRunTour(true); // เริ่มทัวร์
  };

  return (
    <RequireLogin>
      <div className={`main-con-home ${isDarkMode ? "dark-mode" : ""}`}>
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
                    title: "กีฬา",
                    genres: [
                      {
                        title: "Educational and self-development",
                        tabs: [
                          "Art/Craft Workshops",
                          "Seminars / Short Courses",
                          "Talk show/Lecture",
                        ],
                      },
                      {
                        title: "Entertainment and cultural",
                        tabs: [
                          "Art exhibition/Gallery",
                          "Cosplay Event",
                          "Anime Convention",
                          "Comic Con",
                          "Board Game Cafe",
                          "Escape Room",
                          "Interactive Theater",
                          "Stand-up Comedy",
                          "Improv Show",
                          "Film festival/Musical",
                        ],
                      },
                      {
                        title: "Families and children",
                        tabs: ["Camp", "Kids Fair", "Theme park"],
                      },
                      {
                        title: "Group/Specialized",
                        tabs: ["Carnival/Event", "Volunteer"],
                      },
                      {
                        title: "Sports and health",
                        tabs: [
                          "Skateboarding",
                          "BMX",
                          "Parkour",
                          "Rock Climbing",
                          "Badminton",
                          "Table Tennis",
                          "E-sports",
                          "Dance Sport",
                          "Pilates",
                          "Crossfit",
                          "Martial Arts",
                          "Gymnastics",
                          "Marathon",
                          "Audox Tour",
                          "Yoga",
                          "Swimming",
                          "Cycling",
                          "Walking",
                          "Running",
                          "Fitness",
                          "Gym",
                        ],
                      },
                      {
                        title: "Social and community",
                        tabs: [
                          "Speed Dating",
                          "Singles Mixer",
                          "Board Game Night",
                          "Karaoke Party",
                          "Language Exchange",
                          "Book Club",
                          "Movie Night",
                          "Trivia Night",
                          "Annual festival",
                          "Temple fair",
                          "Red Cross fair",
                        ],
                      },
                      {
                        title: "Travel and adventure",
                        tabs: [
                          "Camping",
                          "Trip",
                          "School trip",
                          "Scuba diving",
                          "Photo trip",
                          "Trekking",
                          "Adventure",
                          "Cafe",
                          "Tour",
                        ],
                      },
                      {
                        title: "Music",
                        tabs: [
                          "Concert",
                          "Festival",
                          "Live Performance",
                          "DJ Night",
                          "Karaoke",
                          "K-pop",
                          "Indie",
                          "Hip-hop",
                          "R&B",
                          "Trap",
                          "Lo-fi",
                          "Chill",
                          "Acoustic",
                          "Cover Band",
                          "Busking",
                        ],
                      },
                      {
                        title: "Concert",
                        tabs: [
                          "EDM",
                          "Jazz",
                          "Pop",
                          "Rock",
                          "Obera",
                          "Classical",
                          "Dance",
                          "Mhorum",
                          "Rukthung",
                          "Thai",
                          "Rekgea",
                          "Electronic",
                        ],
                      },
                      {
                        title: "Technology and Digital",
                        tabs: [
                          "Gaming Tournament",
                          "Tech Conference",
                          "Hackathon",
                          "AI Workshop",
                          "Coding Bootcamp",
                          "Startup Pitch",
                          "NFT Exhibition",
                          "VR/AR Experience",
                          "Drone Racing",
                          "Robot Competition",
                          "E-sport Championship",
                        ],
                      },
                      {
                        title: "Social Media and Content",
                        tabs: [
                          "Influencer Meetup",
                          "Content Creator Workshop",
                          "TikTok Challenge",
                          "YouTube Convention",
                          "Podcast Live Recording",
                          "Live Streaming Event",
                          "Photo Contest",
                          "Meme Contest",
                          "Brand Collaboration",
                        ],
                      },
                      {
                        title: "Lifestyle and Trends",
                        tabs: [
                          "Pop-up Store",
                          "Street Food Festival",
                          "Night Market",
                          "Fashion Show",
                          "Beauty Workshop",
                          "Skincare Class",
                          "Sustainable Living",
                          "Thrift Market",
                          "Vintage Fair",
                          "Plant Market",
                        ],
                      },
                      {
                        title: "Food and Beverages",
                        tabs: [
                          "Food Truck Festival",
                          "Coffee Festival",
                          "Bubble Tea Fair",
                          "Cooking Class",
                          "Wine Tasting",
                          "Craft Beer Festival",
                          "Dessert Making",
                          "Street Food Tour",
                          "Michelin Guide Event",
                        ],
                      },
                      {
                        title: "Nightlife and Party",
                        tabs: [
                          "Club Night",
                          "Bar Crawl",
                          "Pool Party",
                          "Silent Disco",
                          "Rooftop Party",
                          "Glow Party",
                        ],
                      },
                    ],
                  },
                ]}
                setWaiting={setWaiting}
              />

              <EventList setWaiting={setWaiting} waiting={waiting} />
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
