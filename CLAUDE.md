# Yakimoto

## Mobile-first

The yakimoto app is **mobile-first**. The mobile version must have the best possible UX and UI for mobile — it is not an afterthought or a scaled-down desktop view.

When building or changing any UI:
- Design and build for mobile first, then enhance for larger screens with `md:`/`lg:` breakpoints.
- Avoid horizontally-scrolling tables on mobile. Use stacked card layouts on mobile and switch to tables only at `md:` and up (see [frontend/src/components/admin/AdminCustomers.jsx](frontend/src/components/admin/AdminCustomers.jsx) for the pattern).
- Tap targets, spacing, and font sizes must feel native on a phone — don't shrink desktop UI to fit.
- Test the mobile breakpoint first when verifying changes.
