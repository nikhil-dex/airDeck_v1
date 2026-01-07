import NextAuth from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import GitHubProvider from "next-auth/providers/github";
import { dbConnect } from "../../../../lib/mongodb";
import User from "@/models/User";

export const authOptions = {
  secret: process.env.NEXTAUTH_SECRET,
  session: {
    strategy: "jwt",
    maxAge: 60 * 60 * 24 * 30,
  },
  
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    }),
    GitHubProvider({
      clientId: process.env.GITHUB_CLIENT_ID,
      clientSecret: process.env.GITHUB_CLIENT_SECRET,
    }),
  ],

  callbacks: {
    async jwt({ token, user, account, profile }) {
      if (user?.email) {
        try {
          await dbConnect();
          const dbUser = await User.findOne({ email: user.email });
          if (dbUser) {
            token.id = String(dbUser._id);
            token.credit = dbUser.credit ?? 0;
            token.name = dbUser.name;
            token.username = dbUser.username;
            token.contact = dbUser.contact;
            // Preserve the original image from OAuth provider
            token.picture = user.image || profile?.picture || token.picture;
          }
        } catch (error) {
          console.error("❌ MongoDB error in jwt callback:", error);
          // Continue with token even if DB fails
        }
      }
      return token;
    },
    async signIn({ user, profile }) {
      try {
        await dbConnect();

        const username = user.email || profile?.login;
        const name = user.name || profile?.name || profile?.login;
        const email = user.email || profile?.email;

        const existingUser = await User.findOne({ email });

        if (!existingUser) {
          await User.create({
            username,
            name,
            email,               
            contact: "",
            profession: "",
            credit: 5,
            
            ppt_History: [],
          });
          console.log("✅ Created new user:", email);
        }
      } catch (error) {
        console.error("❌ MongoDB error in signIn callback:", error);
        // Allow sign-in to proceed even if DB operation fails
        // User can be created on next login attempt
      }

      return true;
    },
    async session({ session, token }) {
      try {
        await dbConnect();
        // Hydrate from token for speed, then ensure fresh credit from DB
        session.user.id = token?.id;
        session.user.username = token?.username;
        session.user.name = token?.name || session.user.name;
        session.user.contact = token?.contact;
        session.user.email = token?.email || session.user.email;
        session.user.credit = token?.credit || 0;
        session.user.profession = token?.profession;
        session.user.ppt_History = token?.ppt_History || [];

        // Ensure image is properly passed from OAuth provider
        session.user.image = token?.picture || session.user.image;

        const fresh = await User.findOne({ email: session.user.email }).select("credit");
        if (fresh) session.user.credit = fresh.credit ?? session.user.credit;
      } catch (error) {
        console.error("❌ MongoDB error in session callback:", error);
        // Use token values as fallback if DB fails
        session.user.id = token?.id;
        session.user.username = token?.username;
        session.user.name = token?.name || session.user.name;
        session.user.contact = token?.contact;
        session.user.email = token?.email || session.user.email;
        session.user.credit = token?.credit || 0;
        session.user.image = token?.picture || session.user.image;
      }
      return session;
    },
  },
  pages: {
    signIn: "/signin",
  },
};

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
