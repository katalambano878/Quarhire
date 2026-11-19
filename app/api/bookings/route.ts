import { type NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { sendBookingEmail } from '@/lib/email';

export async function GET(request: NextRequest) {
    try {
        const auth = await requireAdmin();
        if (!auth) {
            return NextResponse.json({ error: 'Forbidden. Admin or staff access required.' }, { status: 403 });
        }

        const { data: bookings, error } = await supabaseAdmin
            .from('bookings')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) throw error;

        return NextResponse.json({ bookings });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();

        // We use the admin client here to bypass RLS for inserts if needed, 
        // or just rely on the 'public insert' policy we defined in SQL.
        // Using supabaseAdmin ensures it works even if RLS is strict.

        const bookingData = {
            customer_name: body.name,
            customer_email: body.email,
            customer_phone: body.phone,
            pickup_location: body.pickupLocation,
            custom_pickup_location: body.customPickupLocation || null,
            destination: body.destination,
            custom_destination: body.customDestination || null,
            pickup_date: body.date,
            pickup_time: body.time,
            airline: body.airline || null,
            flight_number: body.flightNumber || null,
            vehicle_type: body.vehicleType,
            passengers: body.passengers,
            luggage: body.luggage,
            special_requests: body.specialRequests || null,
            price: parseFloat(body.estimatedPrice.replace(/[^0-9.]/g, '')), // "GHS 500" -> 500.00
            status: body.paymentStatus === 'paid' ? 'paid' : 'pending',
            payment_reference: body.paymentReference || body.bookingReference,
        };

        const { data, error } = await supabaseAdmin
            .from('bookings')
            .insert([bookingData])
            .select('id')
            .single();

        if (error) {
            console.error('Database Error:', error);
            throw error;
        }

        const reference = body.bookingReference || body.paymentReference || data.id;
        const emailResult = await sendBookingEmail({
            name: body.name,
            email: body.email,
            phone: body.phone,
            pickupLocation: body.customPickupLocation || body.pickupLocation,
            destination: body.customDestination || body.destination,
            customDestination: body.customDestination || undefined,
            airline: body.airline || undefined,
            flightNumber: body.flightNumber || undefined,
            vehicleType: body.vehicleType,
            date: body.date,
            time: body.time,
            passengers: Number(body.passengers) || 0,
            luggage: Number(body.luggage) || 0,
            specialRequests: body.specialRequests || undefined,
            estimatedPrice: body.estimatedPrice,
            bookingReference: String(reference),
            paymentStatus: 'reserved',
            paymentReference: body.paymentReference || undefined,
        }, { adminOnly: body.includePayment === true }).catch((emailError) => {
            console.error('Booking email failed:', emailError);
            return { customerSent: false, adminSent: false };
        });

        return NextResponse.json({
            success: true,
            id: data.id,
            adminEmailSent: emailResult.adminSent,
            customerEmailSent: emailResult.customerSent,
        });

    } catch (error: any) {
        console.error('Booking Creation Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
