import campaignModel from "../models/campaignModel.js";
import restaurantModel from "../models/restaurantModel.js";
import { sendToCustomers } from "../routes/emailCampaignRoute.js";

export function startCampaignScheduler() {
  setInterval(async () => {
    try {
      const now = new Date();
      const due = await campaignModel.find({
        status: "scheduled",
        scheduledAt: { $lte: now },
      }).lean();

      for (const campaign of due) {
        try {
          const restaurant = await restaurantModel
            .findById(campaign.restaurantId)
            .select("name subscription");

          if (!restaurant || restaurant.subscription?.plan !== "pro" || restaurant.subscription?.status !== "active") {
            await campaignModel.findByIdAndUpdate(campaign._id, { status: "failed" });
            continue;
          }

          const { sent, failed, recipientCount } = await sendToCustomers({
            restaurant,
            subject:    campaign.subject,
            heading:    campaign.heading,
            body:       campaign.body,
            ctaText:    campaign.ctaText,
            ctaUrl:     campaign.ctaUrl,
            type:       campaign.type,
            personalize: true,
          });

          await campaignModel.findByIdAndUpdate(campaign._id, {
            status:         sent > 0 ? "sent" : "failed",
            sentAt:         new Date(),
            recipientCount,
            sentCount:      sent,
            failedCount:    failed,
          });

          console.log(`[scheduler] Campaign "${campaign.subject}" sent to ${sent} customers.`);
        } catch (err) {
          console.error(`[scheduler] Failed campaign ${campaign._id}:`, err.message);
          await campaignModel.findByIdAndUpdate(campaign._id, { status: "failed" });
        }
      }
    } catch (err) {
      console.error("[scheduler] Error checking campaigns:", err.message);
    }
  }, 60 * 1000);

  console.log("✅ Campaign scheduler started");
}