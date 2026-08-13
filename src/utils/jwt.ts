import jwt from 'jsonwebtoken';

export const generateToken = (userUid: string ): string => {
    return jwt.sign(
        {userUid : userUid},
        process.env.JWT_SECRET!,
        {expiresIn: '24h'}
    );
}