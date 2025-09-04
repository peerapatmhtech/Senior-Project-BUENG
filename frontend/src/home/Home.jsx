import "./Home.css";
import EventList from "./event/Eventlist";
import RequireLogin from "../ui/RequireLogin";
import { useTheme } from "../context/themecontext";
import RoomMatch from "../community/roommatch";
import { useState } from "react";
import AccordionList from "./cardmatch/AccordionList";
import HeaderProfile from "../ui/HeaderProfile";

const Newcommu = () => {
  const { isDarkMode } = useTheme();
  const [selectedRooms, setSelectedRooms] = useState([]);


  return (
    <RequireLogin>
      <div className={`main-con-home ${isDarkMode ? "dark-mode" : ""}`}>
        <header className="header-home">
          <HeaderProfile
            className="profile-section-home"
          />
        </header>
        <div className="event-list-co">
          <div className="bg-event-con">
            <div className="show-commu">
              <div className="accordion-desktop-only">
                <AccordionList
                  items={[
                    {
                      title: "กีฬา",
                      genres: [
                        { title: "Educational and self-development", tabs: ["Art/Craft Workshops", "Seminars / Short Courses", "Talk show/Lecture"] },
                        { title: "Entertainment and cultural", tabs: ["Art exhibition/Gallery", "Cosplay Event", "Anime Convention", "Comic Con", "Board Game Cafe", "Escape Room", "Interactive Theater", "Stand-up Comedy", "Improv Show", "Art exhibition/Gallery", "Art/Craft Workshops", "Film festival/Musical", "Talk show/Lecture"] },
                        { title: "Families and children", tabs: ["Camp", "Kids Fair", "Theme park"] },
                        { title: "Group/Specialized", tabs: ["Carnival/Event", "Volunteer"] },
                        { title: "Sports and health", tabs: ["Skateboarding", "BMX", "Parkour", "Rock Climbing", "Badminton", "Table Tennis", "E-sports", "Dance Sport", "Pilates", "Crossfit", "Martial Arts", "Gymnastics", "Marathon", "Audox Tour", "Yoga", "Swimming", "Cycling", "Walking", "Running", "Fitness", "Gym"] },
                        { title: "Social and community", tabs: ["Speed Dating", "Singles Mixer", "Board Game Night", "Karaoke Party", "Language Exchange", "Book Club", "Movie Night", "Trivia Night", "Annual festival", "Temple fair", "Red Cross fair"] },
                        { title: "Travel and adventure", tabs: ["Camping", "Trip", "School trip", "Scuba diving", "Photo trip", "Trekking", "Adventure", "Cafe", "Tour"] },
                        { title: "Music", tabs: ["Concert", "Festival", "Live Performance", "DJ Night", "Karaoke", "K-pop", "Indie", "Hip-hop", "R&B", "Trap", "Lo-fi", "Chill", "Acoustic", "Cover Band", "Busking"] },
                        { title: "Concert", tabs: ["EDM", "Jazz", "Pop", "Rock", "Obera", "Classical", "Dance", "Mhorum", "Rukthung", "Thai", "Rekgea", "Electronic"] },
                        { title: "Technology and Digital", tabs: ["Gaming Tournament", "Tech Conference", "Hackathon", "AI Workshop", "Coding Bootcamp", "Startup Pitch", "NFT Exhibition", "VR/AR Experience", "Drone Racing", "Robot Competition", "E-sport Championship"] },
                        { title: "Social Media and Content", tabs: ["Influencer Meetup", "Content Creator Workshop", "TikTok Challenge", "YouTube Convention", "Podcast Live Recording", "Live Streaming Event", "Photo Contest", "Meme Contest", "Brand Collaboration"] },
                        { title: "Lifestyle and Trends", tabs: ["Pop-up Store", "Street Food Festival", "Night Market", "Fashion Show", "Beauty Workshop", "Skincare Class", "Sustainable Living", "Thrift Market", "Vintage Fair", "Plant Market"] },
                        { title: "Food and Beverages", tabs: ["Food Truck Festival", "Coffee Festival", "Bubble Tea Fair", "Cooking Class", "Wine Tasting", "Craft Beer Festival", "Dessert Making", "Street Food Tour", "Michelin Guide Event"] },
                        { title: "Nightlife and Party", tabs: ["Club Night", "Bar Crawl", "Pool Party", "Silent Disco", "Rooftop Party", "Glow Party"] },
                      ]
                    }
                  ]}
                />
              </div>
              <EventList />
            </div>
            <RoomMatch
              isDeleteMode={isDarkMode}
              selectedRooms={selectedRooms}
              setSelectedRooms={setSelectedRooms}
              accordionComponent={
                <AccordionList
                  items={[
                    {
                      title: "กีฬา",
                      genres: [
                        { title: "Educational and self-development", tabs: ["Art/Craft Workshops", "Seminars / Short Courses", "Talk show/Lecture"] },
                        { title: "Entertainment and cultural", tabs: ["Art exhibition/Gallery", "Art/Craft Workshops", "Film festival/Musical", "Talk show/Lecture"] },
                        { title: "Families and children", tabs: ["Camp", "Kids Fair", "Theme park"] },
                        { title: "Group/Specialized", tabs: ["Carnival/Event", "Volunteer"] },
                        { title: "Sports and health", tabs: ["Marathon", "Audox Tour", "Yoga", "Swimming", "Cycling", "Walking", "Running", "Fitness", "Gym"] },
                        { title: "Social and community", tabs: ["Annual festival", "Temple fair", "Red Cross fair"] },
                        { title: "Travel and adventure", tabs: ["Camping", "Trip", "School trip", "Scuba diving", "Photo trip", "Trekking", "Adventure", "Cafe", "Tour"] },
                      ]
                    }
                  ]}
                />
              }
            />
          </div>
        </div>
      </div>
    </RequireLogin>
  );
};

export default Newcommu;
