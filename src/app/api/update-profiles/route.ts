import { NextResponse } from 'next/server';
import { updateAllProfiles } from '@/lib/firebase/firebaseUtils';

export async function GET() {
  try {
    const result = await updateAllProfiles();
    if (result) {
      return NextResponse.json({ success: true, message: 'Profiles updated successfully' });
    } else {
      return NextResponse.json({ success: false, message: 'Failed to update profiles' }, { status: 500 });
    }
  } catch (error) {
    console.error('Error updating profiles:', error);
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 });
  }
} 