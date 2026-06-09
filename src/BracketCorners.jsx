import React from 'react';

const BracketCorners = ({ size = 14, opacity = 0.7 }) => (
  <>
    <span className="absolute top-0 left-0 pointer-events-none" style={{ width: size, height: size, borderTop: `1px solid rgba(var(--color-primary), ${opacity})`, borderLeft: `1px solid rgba(var(--color-primary), ${opacity})`, zIndex: 2 }} />
    <span className="absolute top-0 right-0 pointer-events-none" style={{ width: size, height: size, borderTop: `1px solid rgba(var(--color-primary), ${opacity})`, borderRight: `1px solid rgba(var(--color-primary), ${opacity})`, zIndex: 2 }} />
    <span className="absolute bottom-0 left-0 pointer-events-none" style={{ width: size, height: size, borderBottom: `1px solid rgba(var(--color-primary), ${opacity})`, borderLeft: `1px solid rgba(var(--color-primary), ${opacity})`, zIndex: 2 }} />
    <span className="absolute bottom-0 right-0 pointer-events-none" style={{ width: size, height: size, borderBottom: `1px solid rgba(var(--color-primary), ${opacity})`, borderRight: `1px solid rgba(var(--color-primary), ${opacity})`, zIndex: 2 }} />
  </>
);

export default BracketCorners;
