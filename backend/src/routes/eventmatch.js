import express from "express";
import { Like } from "../model/like.js";
import { InfoMatch } from "../model/infomatch.js";

export default function (io) {
  const router = express.Router();

  router.post("/events/match", async (req, res) => {
    const { email, action } = req.body;

    try {
      const currentUserEventIds = action.eventsId;

      // Find likes from other users that match the current user's liked events
      const otherUserLikes = await Like.find({
        userEmail: { $ne: email },
        eventId: { $in: currentUserEventIds },
      });

      if (!otherUserLikes || otherUserLikes.length === 0) {
        return res
          .status(200)
          .json({ message: "No likes found from other users" });
      }

      for (const like of otherUserLikes) {
        // To ensure uniqueness, sort emails alphabetically
        const users = [req.body.email, like.userEmail].sort();

        // Avoid creating duplicate pending matches
        const existingMatch = await InfoMatch.findOne({
          eventId: like.eventId,
          email: users[0],
          usermatch: users[1],
          status: { $in: ["pending", "matched"] }, // Don't recreate if it was already unmatched
        });
        if (existingMatch) continue;

        const newInfoMatch = new InfoMatch({
          eventId: like.eventId,
          detail: like.eventTitle,
          email: users[0], // Always store the alphabetically first email here
          usermatch: users[1], // And the second here
          chance: 40,
          status: "pending", // Initial status
          initiatorEmail: req.body.email, // The user who triggered this action
        });

        await newInfoMatch.save();
        io.emit("match_updated"); // Emit event here
      }

      res.status(200).json({
        message: "Matching process completed",
        matchedLikes: otherUserLikes,
      });
    } catch (error) {
      console.error("Error matching events:", error);
      res.status(500).json({ message: "Server error" });
    }
  });

  // This route is now used for "skipping" a match
  router.delete("/infomatch/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const match = await InfoMatch.findById(id);

      if (!match) {
        return res.status(404).json({ message: "Match not found" });
      }

      match.skipCount += 1;

      if (match.skipCount >= 3) {
        match.status = "unmatched";
      }

      await match.save();
      queryClient.invalidateQueries({ queryKey: ["rooms", userEmail] });
      res.status(200).json({ message: "Match action recorded", match });
    } catch (error) {
      console.error("❌ Error updating match status:", error);
      res.status(500).json({ message: "Server error" });
    }
  });

  return router;
}
