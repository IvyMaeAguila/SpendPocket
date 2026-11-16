import Ambulance from 'lucide-react-native/icons/ambulance';
import Apple from 'lucide-react-native/icons/apple';
import Armchair from 'lucide-react-native/icons/armchair';
import Baby from 'lucide-react-native/icons/baby';
import Banknote from 'lucide-react-native/icons/banknote';
import Bike from 'lucide-react-native/icons/bike';
import Bolt from 'lucide-react-native/icons/bolt';
import BriefcaseBusiness from 'lucide-react-native/icons/briefcase-business';
import Cake from 'lucide-react-native/icons/cake';
import Camera from 'lucide-react-native/icons/camera';
import CarFront from 'lucide-react-native/icons/car-front';
import Cat from 'lucide-react-native/icons/cat';
import ChefHat from 'lucide-react-native/icons/chef-hat';
import Cigarette from 'lucide-react-native/icons/cigarette';
import Clapperboard from 'lucide-react-native/icons/clapperboard';
import Cloud from 'lucide-react-native/icons/cloud';
import Coins from 'lucide-react-native/icons/coins';
import CreditCard from 'lucide-react-native/icons/credit-card';
import Dog from 'lucide-react-native/icons/dog';
import Droplets from 'lucide-react-native/icons/droplets';
import Dumbbell from 'lucide-react-native/icons/dumbbell';
import Fuel from 'lucide-react-native/icons/fuel';
import Gamepad2 from 'lucide-react-native/icons/gamepad-2';
import GlassWater from 'lucide-react-native/icons/glass-water';
import GraduationCap from 'lucide-react-native/icons/graduation-cap';
import Hammer from 'lucide-react-native/icons/hammer';
import Headphones from 'lucide-react-native/icons/headphones';
import Hotel from 'lucide-react-native/icons/hotel';
import HousePlug from 'lucide-react-native/icons/house-plug';
import IceCreamCone from 'lucide-react-native/icons/ice-cream-cone';
import Landmark from 'lucide-react-native/icons/landmark';
import Laptop from 'lucide-react-native/icons/laptop';
import Leaf from 'lucide-react-native/icons/leaf';
import Lightbulb from 'lucide-react-native/icons/lightbulb';
import Lock from 'lucide-react-native/icons/lock';
import Luggage from 'lucide-react-native/icons/luggage';
import Milk from 'lucide-react-native/icons/milk';
import Monitor from 'lucide-react-native/icons/monitor';
import Music2 from 'lucide-react-native/icons/eighth-note';
import Package from 'lucide-react-native/icons/package';
import ParkingMeter from 'lucide-react-native/icons/parking-meter';
import PawPrint from 'lucide-react-native/icons/paw-print';
import Phone from 'lucide-react-native/icons/phone';
import PiggyBank from 'lucide-react-native/icons/piggy-bank';
import Pill from 'lucide-react-native/icons/pill';
import Pizza from 'lucide-react-native/icons/pizza';
import Plug from 'lucide-react-native/icons/plug';
import Popcorn from 'lucide-react-native/icons/popcorn';
import Salad from 'lucide-react-native/icons/salad';
import Scissors from 'lucide-react-native/icons/scissors';
import Shirt from 'lucide-react-native/icons/shirt';
import ShoppingBasket from 'lucide-react-native/icons/shopping-basket';
import Smartphone from 'lucide-react-native/icons/smartphone';
import Sparkles from 'lucide-react-native/icons/sparkles';
import Stethoscope from 'lucide-react-native/icons/stethoscope';
import Ticket from 'lucide-react-native/icons/ticket';
import TrainFront from 'lucide-react-native/icons/train-front';
import Tv from 'lucide-react-native/icons/tv';
import Umbrella from 'lucide-react-native/icons/umbrella';
import Wifi from 'lucide-react-native/icons/wifi';
import Wine from 'lucide-react-native/icons/wine';
import Wrench from 'lucide-react-native/icons/wrench';

export const categoryIconLibrary = [
  { group: 'Food', icons: [
    ['groceries', 'Groceries', ShoppingBasket], ['pizza', 'Pizza', Pizza], ['fruit', 'Fruit', Apple],
    ['salad', 'Salad', Salad], ['cake', 'Cake and bakery', Cake], ['ice-cream', 'Ice cream', IceCreamCone],
    ['milk', 'Milk', Milk], ['water-glass', 'Drinks', GlassWater], ['wine', 'Wine and bars', Wine],
    ['cooking', 'Cooking', ChefHat], ['tobacco', 'Tobacco', Cigarette],
  ] },
  { group: 'Travel', icons: [
    ['car', 'Car and taxi', CarFront], ['bike', 'Bicycle', Bike], ['train', 'Train and metro', TrainFront],
    ['fuel', 'Gas and fuel', Fuel], ['parking', 'Parking', ParkingMeter], ['hotel', 'Hotel', Hotel],
    ['luggage', 'Luggage', Luggage],
  ] },
  { group: 'Home', icons: [
    ['furniture', 'Furniture', Armchair], ['electricity', 'Electricity', Bolt], ['water-bill', 'Water bill', Droplets],
    ['internet', 'Internet and Wi-Fi', Wifi], ['utility', 'Utilities', HousePlug], ['plug', 'Electrical supplies', Plug],
    ['lightbulb', 'Lighting', Lightbulb], ['tools', 'Hardware and tools', Hammer], ['repairs', 'Repairs', Wrench],
    ['garden', 'Garden and plants', Leaf], ['security', 'Security', Lock],
  ] },
  { group: 'Health', icons: [
    ['medicine', 'Medicine and pharmacy', Pill], ['doctor', 'Doctor and clinic', Stethoscope],
    ['ambulance', 'Emergency care', Ambulance], ['fitness', 'Fitness and gym', Dumbbell],
    ['baby', 'Baby and childcare', Baby], ['beauty', 'Beauty and salon', Scissors],
    ['skincare', 'Skincare', Sparkles], ['dog', 'Dog', Dog], ['cat', 'Cat', Cat], ['pet-care', 'Pet care', PawPrint],
  ] },
  { group: 'Shopping', icons: [
    ['clothes', 'Clothes and fashion', Shirt], ['delivery', 'Delivery and packages', Package],
    ['mobile', 'Mobile phone', Smartphone], ['phone', 'Phone bill', Phone], ['computer', 'Laptop', Laptop],
    ['monitor', 'Monitor and electronics', Monitor], ['camera', 'Camera', Camera],
  ] },
  { group: 'Activities', icons: [
    ['games', 'Video games', Gamepad2], ['movies', 'Movies and cinema', Clapperboard],
    ['tickets', 'Tickets and events', Ticket], ['popcorn', 'Popcorn', Popcorn], ['tv', 'TV and streaming', Tv],
    ['music', 'Music', Music2], ['headphones', 'Headphones and audio', Headphones],
    ['education', 'Education and tuition', GraduationCap], ['work', 'Work and business', BriefcaseBusiness],
    ['cloud', 'Cloud storage', Cloud],
  ] },
  { group: 'Money', icons: [
    ['cash', 'Cash', Banknote], ['coins', 'Coins', Coins], ['card', 'Credit or debit card', CreditCard],
    ['bank', 'Bank and transfers', Landmark], ['savings', 'Savings', PiggyBank], ['insurance', 'Insurance', Umbrella],
  ] },
] as const;
