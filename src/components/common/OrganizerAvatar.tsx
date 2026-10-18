import React, { useState } from 'react';
import { MaleSilhouetteAvatar } from './MaleSilhouetteAvatar';
import { isRealOrganizerPhoto } from '../../utils/helpers';

interface OrganizerAvatarProps {
  photo?: string | null;
  name?: string;
  className?: string;
  imgClassName?: string;
  iconClassName?: string;
}

export const OrganizerAvatar: React.FC<OrganizerAvatarProps> = ({
  photo,
  name = 'Organizer',
  className = 'w-full h-full',
  imgClassName = 'w-full h-full object-cover',
  iconClassName,
}) => {
  const [imgError, setImgError] = useState(false);
  const isValidPhoto = !imgError && isRealOrganizerPhoto(photo);

  if (!isValidPhoto || !photo) {
    return <MaleSilhouetteAvatar className={className} iconClassName={iconClassName} />;
  }

  return (
    <img
      src={photo}
      alt={name}
      className={imgClassName}
      onError={() => setImgError(true)}
    />
  );
};
