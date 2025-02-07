import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import "./Networks.scss";

const networks = [
  { name: "TON", icon: "🌐" },
  { name: "Ethereum", icon: "⟠" },
  { name: "Polkadot", icon: "●" },
  { name: "Kusama", icon: "◆" },
  { name: "Moonbeam", icon: "○" },
  { name: "Astar", icon: "★" },
];

const Networks = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [filteredNetworks, setFilteredNetworks] = useState(networks);

  useEffect(() => {
    const filtered = networks.filter((network) =>
      network.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setFilteredNetworks(filtered);
  }, [searchTerm]);

  const containerVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.8,
        staggerChildren: 0.1,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
    },
  };

  return (
    <section className="networks section" id="networks">
      <div className="container">
        <motion.div
          className="networks__header"
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
        >
          <motion.h2 variants={itemVariants} className="gradient-text">
            80+ Networks from TON to EVM and Polkadot
          </motion.h2>
          <motion.p variants={itemVariants}>
            Connect and manage your assets across multiple blockchain networks
            with seamless integration and enhanced security features.
          </motion.p>
          <motion.div variants={itemVariants} className="networks__search">
            <input
              type="text"
              placeholder="Search networks..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </motion.div>
        </motion.div>

        <motion.div
          className="networks__grid"
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
        >
          {filteredNetworks.map((network, index) => (
            <motion.div
              key={network.name}
              className="networks__item"
              variants={itemVariants}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <div className="networks__icon">{network.icon}</div>
              <h3>{network.name}</h3>
            </motion.div>
          ))}
        </motion.div>

        <motion.div
          className="networks__cta"
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
        >
          <motion.p variants={itemVariants}>
            And many more networks supported and regularly added!
          </motion.p>
          <motion.a
            variants={itemVariants}
            href="#"
            className="btn btn-primary"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            View All Networks
          </motion.a>
        </motion.div>
      </div>
    </section>
  );
};

export default Networks;
